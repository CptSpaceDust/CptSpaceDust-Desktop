# CrewDeck Security Policy

CrewDeck handles community accounts, private messages, notifications, voice calls, screen sharing, and application updates. Please report security issues privately so they can be investigated before details become public.

## Supported versions

| Version | Security support |
| --- | --- |
| Latest published release | Supported |
| Older releases | Update required |

CrewDeck updates automatically. If you are testing an issue, first confirm it still exists in the newest published version.

## Reporting a vulnerability

Use [GitHub's private vulnerability reporting form](https://github.com/CptSpaceDust/CrewDeck/security/advisories/new). Do not open a public issue for a suspected vulnerability.

Please include:

- A clear description of the issue and its potential impact.
- The CrewDeck version and Windows version you tested.
- Reproduction steps or a minimal proof of concept.
- Any relevant screenshots, logs, or affected URLs with secrets removed.
- Whether the issue affects the desktop app, website, updater, or shared backend.

Never include passwords, session tokens, private messages, API keys, or another member's personal information in a report.

## What to expect

- An initial acknowledgement is normally provided within 72 hours.
- The report will be investigated and prioritized based on impact and reproducibility.
- Progress updates are normally provided at least once every seven days while a confirmed issue is being fixed.
- A disclosure date will be coordinated when public disclosure is appropriate.

Complex issues or fixes involving third-party services may take longer. Please allow a reasonable remediation period before publishing details.

## In scope

- Authentication, password-reset, session, or authorization flaws.
- Access to another member's private messages, profile data, notifications, calls, or meetups.
- Privileged administration authorization bypasses.
- Remote code execution, code injection, unsafe navigation, or exposed Electron capabilities.
- Update, installer, custom-protocol, or release-integrity issues.
- Voice-call or screen-sharing privacy failures.
- Supabase database, Row Level Security, Storage, Realtime, or Edge Function authorization issues used by CrewDeck.
- Leaked secrets committed to this repository or shipped in a release.

## Out of scope

- Reports that only describe an outdated CrewDeck release and disappear after updating.
- Social engineering, phishing, physical access, or attacks requiring control of the victim's Windows account.
- Denial-of-service testing, spam, automated account creation, or high-volume traffic.
- Vulnerabilities in GitHub, Supabase, LiveKit, Stripe, or another provider that do not demonstrate a CrewDeck-specific impact.
- Cosmetic issues or missing security headers without a practical security impact.
- Access to information a member intentionally made public through CrewDeck community features.

Do not disrupt the community, access data that is not yours, persist after demonstrating the issue, or test against another member without their permission.

## Safe harbor

Good-faith research that follows this policy, avoids privacy violations and service disruption, and gives the project reasonable time to respond will not be treated as malicious activity by the CrewDeck project. This does not authorize activity against third-party services or override their policies.

Thank you for helping keep CrewDeck and its community safe.
