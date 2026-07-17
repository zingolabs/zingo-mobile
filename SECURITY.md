# Security Policy

## Supported Versions

| Platform | Store                                                                                                   | Supported |
| -------- | ------------------------------------------------------------------------------------------------------- | --------- |
| iOS      | [App Store](https://apps.apple.com/app/zingo/id1668209531)                                              | ✓         |
| Android  | [Google Play](https://play.google.com/store/apps/details?id=org.ZingoLabs.Zingo)                        | ✓         |

Only the latest released version on each platform receives security fixes. Older versions are not backported.

## Reporting a Vulnerability

If you believe you have found a security vulnerability in Zingo, please **do not open a public GitHub issue**. Instead, report it privately:

**Email:** zingodisclosure@proton.me

Please include as much of the following as possible:

- A clear description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept
- Affected version(s) and platform(s)
- Any suggested mitigations

## What to Expect

- **Acknowledgement** within 72 hours of your report.
- **Status update** within 7 days with an initial assessment.
- **Coordinated disclosure** — we will work with you to agree on a disclosure timeline before any public announcement.
- Credit in the release notes if you wish to be acknowledged.

## Scope

Issues considered in scope:

- Private key or seed phrase exposure
- Unauthorized fund transfer or transaction signing
- Authentication or authorization bypasses
- Cryptographic weaknesses in wallet or shielded transaction handling
- Remote code execution or data exfiltration affecting app users

Out of scope:

- Denial of service against the lightwalletd server
- Issues in third-party dependencies not directly introduced by this project
- Social engineering or phishing attacks
- Reports already publicly known

## Disclosure Policy

We follow a **90-day coordinated disclosure** timeline. If a fix cannot be delivered within that window we will communicate the reasons and agree on an extension with the reporter.
