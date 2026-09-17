//! The wallet backend's FFI: one typed contract over zingolib, generated into Kotlin, Swift, and TypeScript.

uniffi::setup_scaffolding!("zingo");

include!(concat!(env!("OUT_DIR"), "/zm_description.rs"));

mod config;
mod error;
mod events;
mod functions;
mod logger;
mod registry;
mod runtime;
mod types;
mod wallet;

pub use error::{LoadError, ZingoError};
pub use events::EventStream;
pub use functions::*;
pub use logger::{LogLevel, init_logging};
pub use registry::current_wallet;
pub use types::*;
pub use wallet::Wallet;
