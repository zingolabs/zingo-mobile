//! The one runtime every export runs on, and the panic report that a failed task becomes.

use std::backtrace::Backtrace;
use std::future::Future;
use std::panic::{self, PanicHookInfo};
use std::sync::{Mutex, Once};

use once_cell::sync::Lazy;
use tokio::runtime::Runtime;
use tokio::task::{JoinError, JoinHandle};

use crate::error::ZingoError;

pub(crate) static RT: Lazy<Runtime> = Lazy::new(|| {
    install_panic_hook();
    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .thread_name("zingo-ffi")
        .build()
        .expect("the wallet runtime must build")
});

/// A join handle whose task stops when the handle is dropped.
pub(crate) struct AbortOnDrop<T>(pub(crate) JoinHandle<T>);

impl<T> Drop for AbortOnDrop<T> {
    fn drop(&mut self) {
        self.0.abort();
    }
}

/// Runs `work` on the runtime and turns a panic inside it into `ZingoError::Panic`.
pub(crate) async fn run<T, F>(work: F) -> Result<T, ZingoError>
where
    T: Send + 'static,
    F: Future<Output = Result<T, ZingoError>> + Send + 'static,
{
    let mut handle = AbortOnDrop(RT.spawn(work));
    match (&mut handle.0).await {
        Ok(outcome) => outcome,
        Err(join) => Err(panic_error(join)),
    }
}

/// Spawns detached work on the runtime and returns the handle that stops it.
pub(crate) fn spawn<F>(work: F) -> AbortOnDrop<()>
where
    F: Future<Output = ()> + Send + 'static,
{
    AbortOnDrop(RT.spawn(work))
}

fn panic_error(join: JoinError) -> ZingoError {
    let report = take_last_panic();
    let fallback = join.to_string();
    ZingoError::Panic {
        detail: report.render(fallback),
    }
}

#[derive(Clone, Default)]
struct PanicReport {
    msg: String,
    location: Option<String>,
    backtrace: Option<String>,
}

impl PanicReport {
    fn render(self, fallback: String) -> String {
        let mut out = String::new();
        if let Some(location) = &self.location {
            out.push_str(location);
            out.push_str(": ");
        }
        if self.msg.is_empty() {
            out.push_str(&fallback);
        } else {
            out.push_str(&self.msg);
        }
        if let Some(bt) = self.backtrace {
            let cleaned = clean_backtrace(&bt);
            if !cleaned.is_empty() {
                out.push_str("\nBacktrace:\n");
                out.push_str(&cleaned);
            }
        }
        out
    }
}

static LAST_PANIC: Mutex<PanicReport> = Mutex::new(PanicReport {
    msg: String::new(),
    location: None,
    backtrace: None,
});

static PANIC_HOOK: Once = Once::new();

fn take_last_panic() -> PanicReport {
    let mut slot = LAST_PANIC
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    std::mem::take(&mut *slot)
}

fn clean_backtrace(raw: &str) -> String {
    raw.lines()
        .map(str::trim_end)
        .filter(|line| !line.trim().is_empty() && !line.contains("<unknown>"))
        .map(|line| format!("{line}\n"))
        .collect()
}

fn install_panic_hook() {
    PANIC_HOOK.call_once(|| {
        panic::set_hook(Box::new(|info: &PanicHookInfo<'_>| {
            let msg = if let Some(s) = info.payload().downcast_ref::<&str>() {
                (*s).to_string()
            } else if let Some(s) = info.payload().downcast_ref::<String>() {
                s.clone()
            } else {
                info.to_string()
            };
            let location = info
                .location()
                .map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column()));
            let backtrace = Backtrace::force_capture().to_string();
            let report = PanicReport {
                msg: msg.clone(),
                location: location.clone(),
                backtrace: Some(backtrace),
            };
            log::error!(target: "zingo::ffi", location = location.as_deref().unwrap_or("?"); "panic: {msg}");
            let mut slot = LAST_PANIC
                .lock()
                .unwrap_or_else(|poisoned| poisoned.into_inner());
            *slot = report;
        }));
    });
}

/// Tests that a panic inside runtime work arrives as the typed `Panic` with
/// the panic message in its detail.
#[cfg(test)]
mod panic_tests {
    use super::*;

    #[test]
    fn a_panic_becomes_the_typed_error() {
        let outcome: Result<(), ZingoError> = RT.block_on(run(async {
            panic!("the wallet tripped");
        }));
        let Err(ZingoError::Panic { detail }) = outcome else {
            panic!("a panic must arrive as Panic: {outcome:?}");
        };
        assert!(detail.contains("the wallet tripped"), "{detail}");
    }
}
