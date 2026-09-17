//! The platform log sink every `log` record of this crate and of zingolib reaches.

use std::sync::Once;

use log::LevelFilter;
use log::kv::{Key, Value, VisitSource};

#[derive(Debug, Clone, Copy, PartialEq, Eq, uniffi::Enum)]
pub enum LogLevel {
    Error,
    Warn,
    Info,
    Debug,
    Trace,
}

impl From<LogLevel> for LevelFilter {
    fn from(level: LogLevel) -> Self {
        match level {
            LogLevel::Error => LevelFilter::Error,
            LogLevel::Warn => LevelFilter::Warn,
            LogLevel::Info => LevelFilter::Info,
            LogLevel::Debug => LevelFilter::Debug,
            LogLevel::Trace => LevelFilter::Trace,
        }
    }
}

struct KeyValues(String);

impl<'kvs> VisitSource<'kvs> for KeyValues {
    fn visit_pair(&mut self, key: Key<'kvs>, value: Value<'kvs>) -> Result<(), log::kv::Error> {
        self.0.push_str(&format!(" {key}={value}"));
        Ok(())
    }
}

/// Renders a record's key-values after its message.
pub(crate) fn line(record: &log::Record) -> String {
    let mut pairs = KeyValues(String::new());
    let _ = record.key_values().visit(&mut pairs);
    format!("{}{}", record.args(), pairs.0)
}

#[cfg(not(target_os = "android"))]
struct Stderr;

#[cfg(not(target_os = "android"))]
impl log::Log for Stderr {
    fn enabled(&self, _metadata: &log::Metadata) -> bool {
        true
    }

    fn log(&self, record: &log::Record) {
        eprintln!("[{}] {}: {}", record.level(), record.target(), line(record));
    }

    fn flush(&self) {}
}

#[cfg(not(target_os = "android"))]
static STDERR: Stderr = Stderr;

static INIT: Once = Once::new();

/// Installs the platform sink once per process: logcat on Android, stderr elsewhere.
#[uniffi::export]
pub fn init_logging(max_level: LogLevel) {
    INIT.call_once(|| {
        #[cfg(target_os = "android")]
        {
            let level = match max_level {
                LogLevel::Error => log::Level::Error,
                LogLevel::Warn => log::Level::Warn,
                LogLevel::Info => log::Level::Info,
                LogLevel::Debug => log::Level::Debug,
                LogLevel::Trace => log::Level::Trace,
            };
            android_logger::init_once(
                android_logger::Config::default()
                    .with_min_level(level)
                    .with_tag("zingo"),
            );
        }
        #[cfg(not(target_os = "android"))]
        {
            let _ = log::set_logger(&STDERR);
        }
    });
    log::set_max_level(max_level.into());
}
