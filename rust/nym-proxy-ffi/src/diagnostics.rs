//! The three-leg observation surface (ADR 0007), compiled only under the
//! `diagnostics` feature and consumed only by debug wallet builds.
//!
//! A mixnet send crosses three legs: the client's websocket to its entry
//! gateway, the sphinx path to the Exit Node, and the exit's TCP connection
//! to the destination. nym exposes none of them across an API, so this
//! module captures nym's own `tracing` events from the two targets where
//! the legs surface (`nym_gateway_client`, `nym_socks5_client_core`) and
//! streams them, with the typed bootstrap narrative, to one
//! [`MixnetDiagnosticsObserver`]. Two caller-driven probes classify what a
//! deadline-bounded round trip through the running proxy proves: the
//! Sentinel arm rides `zingo_netutils::sentinel` (legs one and two), and
//! the destination arm completes a TLS handshake against a caller-supplied
//! destination, verifying against the compiled-in Mozilla bundle (ADR
//! 0006). The log coupling this module accepts is the reason it never
//! ships in a release binary.

use std::collections::VecDeque;
use std::net::SocketAddr;
use std::sync::{Mutex, OnceLock, mpsc};
use std::time::{Duration, Instant};

use tokio_rustls::TlsConnector;
use tokio_rustls::rustls;
use zingo_netutils::BootstrapEvent;
use zingo_netutils::sentinel::{self, ExitEvidence};

use crate::{MixnetProxyHandle, ProxyDeathObserver, ProxyFfiError};

/// How many captured events the classification window retains.
const WINDOW_CAPACITY: usize = 256;

/// One step of the mixnet's observed life, streamed to the host as it happens.
#[derive(Clone, Debug, PartialEq, Eq, uniffi::Enum)]
pub enum MixnetDiagnosticsEvent {
    /// The Exit Node discovery query left for the Nym directory.
    DiscoveryStarted,
    /// The directory answered the discovery query.
    DiscoveryFinished {
        /// The count of Exit Nodes the directory advertised.
        candidate_count: u32,
    },
    /// A pull of this Exit Node launched.
    PullLaunched {
        /// The Exit Node address the pull races.
        exit_node: String,
    },
    /// The pull of this Exit Node failed.
    PullFailed {
        /// The Exit Node address whose pull failed.
        exit_node: String,
        /// The failure rendered for a human.
        error: String,
    },
    /// The race kept this Exit Node and the local listener is up.
    Connected {
        /// The Exit Node address the proxy bound.
        exit_node: String,
    },
    /// A captured event from nym's gateway client, where leg one surfaces.
    GatewayClientReport {
        /// The event's level, rendered.
        level: String,
        /// The event's message, rendered.
        message: String,
    },
    /// A captured event from nym's SOCKS5 client core, where the exit's
    /// refusal reason surfaces.
    Socks5CoreReport {
        /// The event's level, rendered.
        level: String,
        /// The event's message, rendered.
        message: String,
    },
}

/// The host implements this to stream every diagnostics event of a proxy
/// started through [`MixnetProxyHandle::start_diagnosed`].
#[uniffi::export(callback_interface)]
pub trait MixnetDiagnosticsObserver: Send + Sync {
    /// Called once per event, in the order the events happened.
    fn on_event(&self, event: MixnetDiagnosticsEvent);
}

/// What one Sentinel round trip through the running proxy proved.
#[derive(Clone, Debug, PartialEq, Eq, uniffi::Enum)]
pub enum SentinelVerdict {
    /// The Sentinel answered, so legs one and two carry traffic.
    ExitProven {
        /// How long the round trip took, in milliseconds.
        millis: u64,
    },
    /// The exit refused the Sentinel, in its own captured words.
    ExitRefused {
        /// The captured refusal, rendered.
        reason: String,
    },
    /// Silence while the gateway client reported errors, so leg one is down.
    GatewayLinkDead {
        /// The captured gateway failure, rendered.
        detail: String,
    },
    /// Clean silence at the deadline, indeterminate beyond the gateway.
    Indeterminate,
}

/// What one TLS handshake against the destination proved.
#[derive(Clone, Debug, PartialEq, Eq, uniffi::Enum)]
pub enum DestinationVerdict {
    /// The handshake completed, so all three legs and the certificate chain
    /// hold.
    DestinationProven {
        /// How long the handshake took, in milliseconds.
        millis: u64,
    },
    /// The TLS layer failed with a named fault.
    HandshakeRefused {
        /// The TLS failure, rendered.
        reason: String,
    },
    /// The exit refused the destination, in its own captured words.
    ExitRefused {
        /// The captured refusal, rendered.
        reason: String,
    },
    /// Silence while the gateway client reported errors, so leg one is down.
    GatewayLinkDead {
        /// The captured gateway failure, rendered.
        detail: String,
    },
    /// The local SOCKS5 tunnel could not open, which is leg zero.
    TunnelFailed {
        /// The tunnel failure, rendered.
        detail: String,
    },
    /// The attempt failed without naming any leg.
    Indeterminate {
        /// What locally ended the attempt, rendered.
        detail: String,
    },
}

/// Which capture target a stored event came from.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum CaptureSource {
    GatewayClient,
    Socks5Core,
}

/// One captured nym event, retained for probe classification.
#[derive(Clone, Debug)]
struct Captured {
    at: Instant,
    source: CaptureSource,
    level: tracing::Level,
    message: String,
}

/// The one crate-wide diagnostics state: the live observer channel and the
/// classification window.
struct DiagnosticsHub {
    sender: Mutex<Option<mpsc::Sender<MixnetDiagnosticsEvent>>>,
    window: Mutex<VecDeque<Captured>>,
}

fn hub() -> &'static DiagnosticsHub {
    static HUB: OnceLock<DiagnosticsHub> = OnceLock::new();
    HUB.get_or_init(|| DiagnosticsHub {
        sender: Mutex::new(None),
        window: Mutex::new(VecDeque::new()),
    })
}

/// Streams `event` to the registered observer, if one is live.
fn publish(event: MixnetDiagnosticsEvent) {
    let sender = hub()
        .sender
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    if let Some(sender) = sender.as_ref() {
        let _ = sender.send(event);
    }
}

/// Records one captured nym event into the classification window and streams
/// it to the observer.
fn record(source: CaptureSource, level: tracing::Level, message: String) {
    {
        let mut window = hub()
            .window
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        if window.len() == WINDOW_CAPACITY {
            window.pop_front();
        }
        window.push_back(Captured {
            at: Instant::now(),
            source,
            level,
            message: message.clone(),
        });
    }
    let level = level.to_string();
    publish(match source {
        CaptureSource::GatewayClient => {
            MixnetDiagnosticsEvent::GatewayClientReport { level, message }
        }
        CaptureSource::Socks5Core => MixnetDiagnosticsEvent::Socks5CoreReport { level, message },
    });
}

/// The captured events at or after `since`, oldest first.
fn window_since(since: Instant) -> Vec<Captured> {
    hub()
        .window
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .iter()
        .filter(|captured| captured.at >= since)
        .cloned()
        .collect()
}

/// The first error-level message from `source` in the window, if any.
fn first_error(window: &[Captured], source: CaptureSource) -> Option<String> {
    window
        .iter()
        .find(|captured| captured.source == source && captured.level == tracing::Level::ERROR)
        .map(|captured| captured.message.clone())
}

/// The `tracing` layer that captures nym's own events from the two targets
/// where the legs surface.
pub(crate) struct CaptureLayer;

/// Renders an event's fields into one message line.
#[derive(Default)]
struct RenderedFields(String);

impl tracing::field::Visit for RenderedFields {
    fn record_debug(&mut self, field: &tracing::field::Field, value: &dyn std::fmt::Debug) {
        use std::fmt::Write as _;
        if !self.0.is_empty() {
            self.0.push(' ');
        }
        if field.name() == "message" {
            let _ = write!(self.0, "{value:?}");
        } else {
            let _ = write!(self.0, "{}={value:?}", field.name());
        }
    }
}

impl<S: tracing::Subscriber> tracing_subscriber::Layer<S> for CaptureLayer {
    fn on_event(
        &self,
        event: &tracing::Event<'_>,
        _ctx: tracing_subscriber::layer::Context<'_, S>,
    ) {
        let target = event.metadata().target();
        let source = if target.starts_with("nym_socks5_client_core") {
            CaptureSource::Socks5Core
        } else if target.starts_with("nym_gateway_client") {
            CaptureSource::GatewayClient
        } else {
            return;
        };
        let mut fields = RenderedFields::default();
        event.record(&mut fields);
        record(source, *event.metadata().level(), fields.0);
    }
}

/// Installs the capture layer as the process subscriber on hosts where no
/// platform log route claims it first.
#[cfg(not(target_os = "android"))]
fn install_capture() {
    use tracing_subscriber::layer::SubscriberExt as _;
    use tracing_subscriber::util::SubscriberInitExt as _;
    let _ = tracing_subscriber::registry().with(CaptureLayer).try_init();
}

/// Carries the typed bootstrap narrative across the FFI unchanged.
fn bootstrap_event(event: BootstrapEvent) -> MixnetDiagnosticsEvent {
    match event {
        BootstrapEvent::DiscoveryStarted => MixnetDiagnosticsEvent::DiscoveryStarted,
        BootstrapEvent::DiscoveryFinished { candidate_count } => {
            MixnetDiagnosticsEvent::DiscoveryFinished {
                candidate_count: u32::try_from(candidate_count).unwrap_or(u32::MAX),
            }
        }
        BootstrapEvent::PullLaunched { exit_node } => {
            MixnetDiagnosticsEvent::PullLaunched { exit_node }
        }
        BootstrapEvent::PullFailed { exit_node, error } => {
            MixnetDiagnosticsEvent::PullFailed { exit_node, error }
        }
        BootstrapEvent::Connected { exit_node } => MixnetDiagnosticsEvent::Connected { exit_node },
    }
}

/// Classifies what one Sentinel round trip proved, given the events captured
/// in its window.
fn classify_sentinel(evidence: ExitEvidence, window: &[Captured]) -> SentinelVerdict {
    match evidence {
        ExitEvidence::Answered { millis } => SentinelVerdict::ExitProven { millis },
        ExitEvidence::Silent => {
            if let Some(reason) = first_error(window, CaptureSource::Socks5Core) {
                SentinelVerdict::ExitRefused { reason }
            } else if let Some(detail) = first_error(window, CaptureSource::GatewayClient) {
                SentinelVerdict::GatewayLinkDead { detail }
            } else {
                SentinelVerdict::Indeterminate
            }
        }
    }
}

/// How one destination handshake attempt ended, before classification.
#[derive(Debug)]
enum HandshakeOutcome {
    Established {
        millis: u64,
    },
    /// The local SOCKS5 tunnel could not open.
    Tunnel {
        detail: String,
    },
    /// The TLS layer itself failed, in rustls's own words.
    Tls {
        reason: String,
    },
    /// The attempt ended without a TLS-layer fault: a timeout, a closed
    /// stream, or a transport error.
    Ended {
        detail: String,
    },
}

/// Classifies what one destination handshake proved, given the events
/// captured in its window.
fn classify_destination(outcome: HandshakeOutcome, window: &[Captured]) -> DestinationVerdict {
    match outcome {
        HandshakeOutcome::Established { millis } => {
            DestinationVerdict::DestinationProven { millis }
        }
        HandshakeOutcome::Tunnel { detail } => DestinationVerdict::TunnelFailed { detail },
        HandshakeOutcome::Tls { reason } => DestinationVerdict::HandshakeRefused { reason },
        HandshakeOutcome::Ended { detail } => {
            if let Some(reason) = first_error(window, CaptureSource::Socks5Core) {
                DestinationVerdict::ExitRefused { reason }
            } else if let Some(gateway) = first_error(window, CaptureSource::GatewayClient) {
                DestinationVerdict::GatewayLinkDead { detail: gateway }
            } else {
                DestinationVerdict::Indeterminate { detail }
            }
        }
    }
}

/// The TLS configuration every destination handshake shares: the ring
/// provider under the Mozilla-bundle verifier the workspace patch supplies.
fn tls_config() -> Result<std::sync::Arc<rustls::ClientConfig>, rustls::Error> {
    static CONFIG: OnceLock<Result<std::sync::Arc<rustls::ClientConfig>, rustls::Error>> =
        OnceLock::new();
    CONFIG
        .get_or_init(|| {
            let provider = std::sync::Arc::new(rustls::crypto::ring::default_provider());
            let verifier = rustls_platform_verifier::Verifier::new(provider.clone())?;
            let config = rustls::ClientConfig::builder_with_provider(provider)
                .with_safe_default_protocol_versions()?
                .dangerous()
                .with_custom_certificate_verifier(std::sync::Arc::new(verifier))
                .with_no_client_auth();
            Ok(std::sync::Arc::new(config))
        })
        .clone()
}

/// One deadline-free handshake attempt; the caller owns the deadline.
async fn destination_handshake(socks5: SocketAddr, host: &str, port: u16) -> HandshakeOutcome {
    let started = Instant::now();
    let tunnel = match tokio_socks::tcp::Socks5Stream::connect(socks5, (host, port)).await {
        Ok(tunnel) => tunnel,
        Err(failure) => {
            return HandshakeOutcome::Tunnel {
                detail: failure.to_string(),
            };
        }
    };
    let config = match tls_config() {
        Ok(config) => config,
        Err(failure) => {
            return HandshakeOutcome::Tls {
                reason: failure.to_string(),
            };
        }
    };
    let server_name = match rustls::pki_types::ServerName::try_from(host.to_string()) {
        Ok(server_name) => server_name,
        Err(failure) => {
            return HandshakeOutcome::Ended {
                detail: failure.to_string(),
            };
        }
    };
    match TlsConnector::from(config)
        .connect(server_name, tunnel.into_inner())
        .await
    {
        Ok(_established) => HandshakeOutcome::Established {
            millis: u64::try_from(started.elapsed().as_millis()).unwrap_or(u64::MAX),
        },
        Err(failure) => match failure
            .get_ref()
            .and_then(|inner| inner.downcast_ref::<rustls::Error>())
        {
            Some(tls) => HandshakeOutcome::Tls {
                reason: tls.to_string(),
            },
            None => HandshakeOutcome::Ended {
                detail: failure.to_string(),
            },
        },
    }
}

impl MixnetProxyHandle {
    /// The listener address the probes tunnel through, if the handle still
    /// renders one.
    fn socks5_addr_for_probes(&self) -> Option<SocketAddr> {
        format!("{}:{}", self.endpoint.host, self.endpoint.port)
            .parse()
            .ok()
    }
}

#[uniffi::export]
impl MixnetProxyHandle {
    /// [`Self::start`], additionally streaming the bootstrap narrative and
    /// every captured nym event to `diagnostics`.
    #[uniffi::constructor]
    pub fn start_diagnosed(
        diagnostics: Box<dyn MixnetDiagnosticsObserver>,
        observer: Option<Box<dyn ProxyDeathObserver>>,
    ) -> Result<std::sync::Arc<Self>, ProxyFfiError> {
        #[cfg(not(target_os = "android"))]
        install_capture();
        let (sender, receiver) = mpsc::channel::<MixnetDiagnosticsEvent>();
        std::thread::spawn(move || {
            while let Ok(event) = receiver.recv() {
                diagnostics.on_event(event);
            }
        });
        *hub()
            .sender
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner()) = Some(sender);
        Self::start_with(observer, |event| publish(bootstrap_event(event)))
    }

    /// One Sentinel round trip through the running proxy, classified into
    /// what it proved about legs one and two.
    pub fn probe_sentinel(&self, deadline_millis: u64) -> SentinelVerdict {
        let (Some(runtime), Some(socks5)) = (self.runtime.as_ref(), self.socks5_addr_for_probes())
        else {
            return SentinelVerdict::Indeterminate;
        };
        let started = Instant::now();
        let evidence = runtime.block_on(sentinel::probe_sentinel(
            socks5,
            Duration::from_millis(deadline_millis),
        ));
        classify_sentinel(evidence, &window_since(started))
    }

    /// One TLS handshake against `host:port` through the running proxy,
    /// classified into what it proved about all three legs.
    pub fn probe_destination(
        &self,
        host: String,
        port: u16,
        deadline_millis: u64,
    ) -> DestinationVerdict {
        let (Some(runtime), Some(socks5)) = (self.runtime.as_ref(), self.socks5_addr_for_probes())
        else {
            return DestinationVerdict::Indeterminate {
                detail: "the handle no longer runs a proxy".to_string(),
            };
        };
        let deadline = Duration::from_millis(deadline_millis);
        let started = Instant::now();
        let outcome = runtime
            .block_on(tokio::time::timeout(
                deadline,
                destination_handshake(socks5, &host, port),
            ))
            .unwrap_or_else(|_| HandshakeOutcome::Ended {
                detail: format!("no handshake within {}ms", deadline.as_millis()),
            });
        classify_destination(outcome, &window_since(started))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn captured(source: CaptureSource, level: tracing::Level, message: &str) -> Captured {
        Captured {
            at: Instant::now(),
            source,
            level,
            message: message.to_string(),
        }
    }

    /// HYPOTHESIS: a Sentinel answer proves the exit whatever the window
    /// holds, and silence classifies by the window: an exit report beats a
    /// gateway report, and a clean window stays indeterminate. Falsified if
    /// any arm yields another verdict.
    #[test]
    fn sentinel_silence_classifies_by_the_captured_window() {
        let exit = captured(
            CaptureSource::Socks5Core,
            tracing::Level::ERROR,
            "network requester refused",
        );
        let gateway = captured(
            CaptureSource::GatewayClient,
            tracing::Level::ERROR,
            "websocket closed",
        );
        assert_eq!(
            classify_sentinel(
                ExitEvidence::Answered { millis: 900 },
                std::slice::from_ref(&exit)
            ),
            SentinelVerdict::ExitProven { millis: 900 }
        );
        assert_eq!(
            classify_sentinel(ExitEvidence::Silent, &[gateway.clone(), exit.clone()]),
            SentinelVerdict::ExitRefused {
                reason: "network requester refused".to_string()
            }
        );
        assert_eq!(
            classify_sentinel(ExitEvidence::Silent, &[gateway]),
            SentinelVerdict::GatewayLinkDead {
                detail: "websocket closed".to_string()
            }
        );
        assert_eq!(
            classify_sentinel(ExitEvidence::Silent, &[]),
            SentinelVerdict::Indeterminate
        );
    }

    /// HYPOTHESIS: a non-error captured event never classifies a silence,
    /// because nym narrates routine work below the error level. Falsified if
    /// an info-level report yields a refusal or a dead gateway link.
    #[test]
    fn only_error_level_captures_classify_a_silence() {
        let routine = [
            captured(CaptureSource::Socks5Core, tracing::Level::INFO, "connected"),
            captured(
                CaptureSource::GatewayClient,
                tracing::Level::DEBUG,
                "keepalive",
            ),
        ];
        assert_eq!(
            classify_sentinel(ExitEvidence::Silent, &routine),
            SentinelVerdict::Indeterminate
        );
    }

    /// HYPOTHESIS: each destination outcome maps to its own verdict, and
    /// only the untyped ending consults the window. Falsified if a TLS
    /// fault or a tunnel fault is re-attributed by captured events.
    #[test]
    fn destination_outcomes_map_to_their_own_verdicts() {
        let exit = captured(
            CaptureSource::Socks5Core,
            tracing::Level::ERROR,
            "destination filtered",
        );
        assert_eq!(
            classify_destination(HandshakeOutcome::Established { millis: 1200 }, &[]),
            DestinationVerdict::DestinationProven { millis: 1200 }
        );
        assert_eq!(
            classify_destination(
                HandshakeOutcome::Tls {
                    reason: "invalid peer certificate: Expired".to_string()
                },
                std::slice::from_ref(&exit)
            ),
            DestinationVerdict::HandshakeRefused {
                reason: "invalid peer certificate: Expired".to_string()
            }
        );
        assert_eq!(
            classify_destination(
                HandshakeOutcome::Tunnel {
                    detail: "connection refused".to_string()
                },
                std::slice::from_ref(&exit)
            ),
            DestinationVerdict::TunnelFailed {
                detail: "connection refused".to_string()
            }
        );
        assert_eq!(
            classify_destination(
                HandshakeOutcome::Ended {
                    detail: "no handshake within 5000ms".to_string()
                },
                &[exit]
            ),
            DestinationVerdict::ExitRefused {
                reason: "destination filtered".to_string()
            }
        );
        assert_eq!(
            classify_destination(
                HandshakeOutcome::Ended {
                    detail: "connection reset".to_string()
                },
                &[]
            ),
            DestinationVerdict::Indeterminate {
                detail: "connection reset".to_string()
            }
        );
    }

    /// HYPOTHESIS: the capture layer records only the two nym targets,
    /// carries the message text, and streams each capture to the registered
    /// observer. Falsified if a foreign target is captured, the text is
    /// lost, or nothing reaches the observer.
    #[test]
    fn the_capture_layer_records_the_two_nym_targets() {
        use tracing_subscriber::layer::SubscriberExt as _;
        let (sender, receiver) = mpsc::channel();
        *hub()
            .sender
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner()) = Some(sender);
        let started = Instant::now();
        let subscriber = tracing_subscriber::registry().with(CaptureLayer);
        tracing::subscriber::with_default(subscriber, || {
            tracing::error!(target: "nym_gateway_client::socket", "gateway boom");
            tracing::error!(target: "nym_socks5_client_core::mixnet", "exit boom");
            tracing::error!(target: "some_other_crate", "unrelated");
        });
        let window = window_since(started);
        assert_eq!(window.len(), 2, "exactly the two nym targets: {window:?}");
        assert_eq!(window[0].source, CaptureSource::GatewayClient);
        assert!(window[0].message.contains("gateway boom"));
        assert_eq!(window[1].source, CaptureSource::Socks5Core);
        assert!(window[1].message.contains("exit boom"));
        let streamed: Vec<MixnetDiagnosticsEvent> = receiver.try_iter().collect();
        assert_eq!(
            streamed,
            vec![
                MixnetDiagnosticsEvent::GatewayClientReport {
                    level: "ERROR".to_string(),
                    message: "gateway boom".to_string(),
                },
                MixnetDiagnosticsEvent::Socks5CoreReport {
                    level: "ERROR".to_string(),
                    message: "exit boom".to_string(),
                },
            ]
        );
    }

    /// HYPOTHESIS: every bootstrap event crosses the FFI with its payload
    /// intact. Falsified if a variant or a field is dropped or renamed.
    #[test]
    fn bootstrap_events_cross_the_ffi_intact() {
        assert_eq!(
            bootstrap_event(BootstrapEvent::DiscoveryFinished {
                candidate_count: 828
            }),
            MixnetDiagnosticsEvent::DiscoveryFinished {
                candidate_count: 828
            }
        );
        assert_eq!(
            bootstrap_event(BootstrapEvent::PullFailed {
                exit_node: "exit.example".to_string(),
                error: "refused".to_string(),
            }),
            MixnetDiagnosticsEvent::PullFailed {
                exit_node: "exit.example".to_string(),
                error: "refused".to_string(),
            }
        );
        assert_eq!(
            bootstrap_event(BootstrapEvent::Connected {
                exit_node: "exit.example".to_string(),
            }),
            MixnetDiagnosticsEvent::Connected {
                exit_node: "exit.example".to_string(),
            }
        );
    }
}
