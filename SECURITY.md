# Trust and privacy

HTTPS authenticates the connection to the configured GitHub Pages host and protects data in transit. SHA-256 verifies that recipe bytes agree with metadata from that same catalog. **A hash is not a digital signature. It cannot independently authenticate a catalog whose owner or hosting account is compromised.** The GitHub account, reviewers and deployment workflow remain trusted publishers.

The Studio adapter accepts only one fixed HTTPS origin and canonical resources, rejects redirects before following, omits credentials/referrers, limits time and streamed bytes, validates all fields and rechecks cached recipes. It cannot be configured to request a LAN, loopback, metadata-service or arbitrary HTTP URL. The native test transport is injected only by the isolated test harness, never through user settings or downloaded data.

Every title, description, instruction and example is untrusted text. The website escapes it into static HTML and uses no dynamic HTML insertion; the plugin uses literal native DOM text. Model prompts are inspected by the user but remain capable of producing misleading output. No claim of factual correctness or semantic prompt-injection immunity is made. Review all generated content before Apply.

The website has no data-receiving service or model execution. GitHub hosting naturally receives ordinary request metadata (e.g. client IP); there is no added tracking. Studio browsing/installation has no Markdown, model, Review or SafeApply port. It only reads/writes plugin-owned public cache, origin records and local recipe definitions. Running installed recipes uses the existing configured model after separate user consent; the selected text may then be sent to that provider, as shown by Studio.

A publication package contains the chosen recipe and explicitly entered public fields only. Private information manually placed in a recipe's instruction must be removed by its author; the software cannot guarantee semantic redaction.

Report a suspected issue privately through GitHub's security reporting if enabled, otherwise contact the repository owner through their public GitHub profile. Do not include vault content, tokens or exploit payloads containing secrets in public issues. There is no automatic remote revocation of installed local recipes.
