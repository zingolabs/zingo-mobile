use std::io::Read as _;
use std::io::Write as _;
use std::net::Ipv4Addr;
use std::net::SocketAddr;
use std::net::TcpListener;
use std::net::TcpStream;
use std::sync::Arc;
use std::sync::Mutex;
use std::sync::atomic::AtomicBool;
use std::sync::atomic::Ordering;

/// The loopback port the stand-in binds, which the emulator reaches at
/// `10.0.2.2:21000`, chosen clear of the harness indexer's `20000`.
pub const SOCKS5_STANDIN_PORT: u16 = 21_000;

/// The SOCKS5 protocol version this stand-in speaks.
const SOCKS5_VERSION: u8 = 0x05;

/// The "no authentication required" method, the only one offered.
const METHOD_NO_AUTH: u8 = 0x00;

/// The CONNECT command, the only one a transmission issues.
const COMMAND_CONNECT: u8 = 0x01;

/// The address-type byte for a literal IPv4 address.
const ADDRESS_TYPE_IPV4: u8 = 0x01;

/// The address-type byte for a length-prefixed domain name.
const ADDRESS_TYPE_DOMAIN: u8 = 0x03;

/// The address-type byte for a literal IPv6 address.
const ADDRESS_TYPE_IPV6: u8 = 0x04;

/// One requested tunnel: the host and port a CONNECT named.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Dial {
    /// The host the client asked the proxy to reach.
    pub host: String,
    /// The port the client asked the proxy to reach.
    pub port: u16,
}

/// A SOCKS5 endpoint that answers the handshake, accepts every CONNECT,
/// and then closes the tunnel without carrying a byte, so a wallet under
/// test dials its Correspondents through a proxy that reaches nothing and
/// no packet leaves the machine.
pub struct Socks5Standin {
    address: SocketAddr,
    dials: Arc<Mutex<Vec<Dial>>>,
    shutdown: Arc<AtomicBool>,
}

impl Socks5Standin {
    /// Binds the stand-in on loopback at [`SOCKS5_STANDIN_PORT`] and serves
    /// it on a background thread until the value is dropped.
    ///
    /// # Panics
    ///
    /// Panics if the port is already bound.
    pub fn bind() -> Self {
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, SOCKS5_STANDIN_PORT))
            .expect("the SOCKS5 stand-in port is free");
        let address = listener
            .local_addr()
            .expect("a bound listener reports its address");
        let dials = Arc::new(Mutex::new(Vec::new()));
        let shutdown = Arc::new(AtomicBool::new(false));

        let served_dials = Arc::clone(&dials);
        let served_shutdown = Arc::clone(&shutdown);
        std::thread::spawn(move || {
            for stream in listener.incoming() {
                if served_shutdown.load(Ordering::Relaxed) {
                    return;
                }
                let Ok(stream) = stream else { continue };
                let accepted_dials = Arc::clone(&served_dials);
                std::thread::spawn(move || {
                    if let Some(dial) = accept_connect(stream) {
                        accepted_dials
                            .lock()
                            .expect("the dial log is never poisoned")
                            .push(dial);
                    }
                });
            }
        });

        Socks5Standin {
            address,
            dials,
            shutdown,
        }
    }

    /// The address the stand-in listens on.
    pub fn address(&self) -> SocketAddr {
        self.address
    }

    /// Every tunnel a client asked for, in the order the requests arrived.
    ///
    /// # Panics
    ///
    /// Panics if the dial log's mutex is poisoned.
    pub fn dials(&self) -> Vec<Dial> {
        self.dials
            .lock()
            .expect("the dial log is never poisoned")
            .clone()
    }
}

impl Drop for Socks5Standin {
    fn drop(&mut self) {
        self.shutdown.store(true, Ordering::Relaxed);
        // Unblock the accept loop so the serving thread observes the flag.
        let _ = TcpStream::connect(self.address);
    }
}

/// Runs one connection through the greeting and the CONNECT request,
/// answers both as a success, and returns the tunnel the client named.
/// The stream then drops, closing the tunnel the client believes it holds.
fn accept_connect(mut stream: TcpStream) -> Option<Dial> {
    let mut greeting = [0u8; 2];
    stream.read_exact(&mut greeting).ok()?;
    if greeting[0] != SOCKS5_VERSION {
        return None;
    }
    let mut methods = vec![0u8; usize::from(greeting[1])];
    stream.read_exact(&mut methods).ok()?;
    stream.write_all(&[SOCKS5_VERSION, METHOD_NO_AUTH]).ok()?;

    let mut request = [0u8; 4];
    stream.read_exact(&mut request).ok()?;
    if request[0] != SOCKS5_VERSION || request[1] != COMMAND_CONNECT {
        return None;
    }
    let host = match request[3] {
        ADDRESS_TYPE_IPV4 => {
            let mut octets = [0u8; 4];
            stream.read_exact(&mut octets).ok()?;
            Ipv4Addr::from(octets).to_string()
        }
        ADDRESS_TYPE_DOMAIN => {
            let mut length = [0u8; 1];
            stream.read_exact(&mut length).ok()?;
            let mut name = vec![0u8; usize::from(length[0])];
            stream.read_exact(&mut name).ok()?;
            String::from_utf8(name).ok()?
        }
        ADDRESS_TYPE_IPV6 => {
            let mut octets = [0u8; 16];
            stream.read_exact(&mut octets).ok()?;
            std::net::Ipv6Addr::from(octets).to_string()
        }
        _ => return None,
    };
    let mut port = [0u8; 2];
    stream.read_exact(&mut port).ok()?;

    // A success reply bound to 0.0.0.0:0. The client now believes it holds
    // a tunnel, which is exactly the empty-exit condition under test: the
    // mixnet accepted the connection and the exit carries nothing.
    stream
        .write_all(&[
            SOCKS5_VERSION,
            0x00,
            0x00,
            ADDRESS_TYPE_IPV4,
            0,
            0,
            0,
            0,
            0,
            0,
        ])
        .ok()?;

    Some(Dial {
        host,
        port: u16::from_be_bytes(port),
    })
}
