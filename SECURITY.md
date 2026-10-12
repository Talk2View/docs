# Security

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Report it privately on GitHub, with this repository's
[private report form](https://github.com/Talk2View/docs/security/advisories/new).
It is also the **Report a vulnerability** button on the **Security and quality**
tab. The report stays private unless we publish an advisory about it. Our
maintainers can read it, and so can anyone we bring in to help fix the problem.

The form needs a GitHub account. If you do not have one, or would rather not
use GitHub, use the contact form at
[talk2view.com/resources/contact](https://talk2view.com/resources/contact)
instead, and start the subject with "Security". The message box holds 2,000
characters and takes no files, so send a summary and we will reply by email
for the rest.

Tell us what you found, how to reproduce it, and what an attacker could do with
it. We aim to confirm receipt within five business days. We will tell you what
we intend to do, and credit you when it is fixed unless you would rather we did
not.

## Where a report belongs

This repository is the source of [docs.talk2view.com](https://docs.talk2view.com).
A problem in an SDK is best reported in the SDK's own repository, so the fix and
any advisory land in the right place:

- `@talk2view/sdk` on npm: the
  [report form in Talk2View/talk2view-typescript](https://github.com/Talk2View/talk2view-typescript/security/advisories/new)
- `talk2view` on PyPI: the
  [report form in Talk2View/talk2view-python](https://github.com/Talk2View/talk2view-python/security/advisories/new)

Every other Talk2View product or service, including the engine and API,
talk2view.com and the partner dashboard, has no public repository. Report a
problem in any of them here, or through the contact form. Do not access or
change data that is not yours, and do not run denial-of-service or load tests
against them.
