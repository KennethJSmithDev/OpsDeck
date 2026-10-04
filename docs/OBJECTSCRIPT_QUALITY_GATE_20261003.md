# ObjectScript Quality Gate Assessment — 2026-10-03

## Decision

**UNAVAILABLE UNDER ACCEPTABLE TRUST BOUNDARY; NOT A MAINLINE-BLOCKING ACCEPTANCE GATE.** The Open Exchange workflow prescribes downloading and executing a mutable shell script from the `master` branch of `litesolutions/objectscriptquality-jenkins-integration`. The script is not pinned or verified before execution. Its inspected implementation disables TLS certificate validation for Jenkins calls (`curl -k`), contains shared Jenkins credentials and a job trigger token in public source, and submits the repository URL and branch to an external Jenkins service. The generated Jenkins job clones that public repository and runs SonarQube over its source tree. This trust boundary is not acceptable, so OpsDeck will not add or execute this integration. The external scanner does not block an otherwise accepted OpsDeck milestone or human-approved mainline candidate.

## Workflow and hook inspected

- Current official InterSystems IRIS development template workflow: `.github/workflows/objectscript-quality.yml` from `intersystems-community/intersystems-iris-dev-template`.
- The template downloads `https://raw.githubusercontent.com/litesolutions/objectscriptquality-jenkins-integration/master/iris-community-hook.sh` and executes it with `sh` on each push.
- The Open Exchange listing labels the package a community project maintained by its author and says it is not officially supported by InterSystems.
- Hook network behavior observed in source:
  - downloads the script from `raw.githubusercontent.com` through the workflow's `wget`;
  - contacts `community-jenkins.objectscriptquality.com` for Jenkins crumb and job APIs;
  - passes the public GitHub repository URL and branch as job-generation parameters;
  - triggers a Jenkins build;
  - the generated job checks out the repository and runs the hosted SonarQube scanner across `.`.
- Secret behavior observed in source: no OpsDeck or GitHub secret is requested by the prescribed hook. Instead, the public shell script embeds shared Jenkins username/password and a build trigger token, then uses them in Basic authentication requests. The hook also uses `curl -k`, so those requests do not validate TLS certificates.
- Execution behavior: GitHub's hosted Ubuntu runner executes the downloaded shell; Jenkins creates/uses a project job, clones the branch, and runs its scanner. Source is therefore made available to the external analysis service. This repository is public, but that does not resolve the unpinned executable and TLS/credential risks.
- Result handling: the hook triggers a Jenkins build and prints that it was executed, but it does not wait for completion or retrieve the analyzer outcome. A successful GitHub step therefore cannot serve as a passing-quality result.

## Results

- Workflow added: **No**; intentionally excluded after trust review.
- Workflow execution: **Not run**.
- Analyzer finding count: **Unavailable; analyzer did not run**. Trust review recorded **5 distinct findings**.
- Relevant findings: mutable remote executable; disabled TLS verification; shared service credentials and trigger token embedded in public hook; source URL/branch sent to and source cloned by a third-party analysis service; hook does not wait for or check the analyzer outcome.
- Fixes made: **None**. No finding was suppressed and no workflow was altered to disguise the inspected trust behavior.
- Remaining limitation: no acceptable, pinned and transport-verified external ObjectScript quality service integration is established. Record this as `OBJECTSCRIPT_QUALITY = UNAVAILABLE_UNDER_ACCEPTABLE_TRUST_BOUNDARY`; it is not a release blocker. Continue ordinary OpsDeck gates: tests, compilation, syntax, package lifecycle, runtime qualification, diff/format checks, security review, and representation-cost sanity. Reconsider an external scanner only if a separately inspected integration provides an acceptable trust boundary.

## Scope and sources

The workflow, hook, README, and generated Jenkins job template were inspected read-only from their public source locations. No hook was executed, no workflow was added, no repository was submitted, and no remote service was contacted by executing the hook.

- [InterSystems IRIS development template workflow](https://raw.githubusercontent.com/intersystems-community/intersystems-iris-dev-template/master/.github/workflows/objectscript-quality.yml)
- [Hook source](https://raw.githubusercontent.com/litesolutions/objectscriptquality-jenkins-integration/master/iris-community-hook.sh)
- [Generated Jenkins job template](https://raw.githubusercontent.com/litesolutions/objectscriptquality-jenkins-integration/master/iris-community-job-template.xml)
- [Integration repository README](https://github.com/litesolutions/objectscriptquality-jenkins-integration)
- [Open Exchange listing](https://openexchange.intersystems.com/package/Community-objectscriptQuality)
