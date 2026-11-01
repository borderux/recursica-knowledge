---
"@recursica/knowledge": minor
---

CircleChat kit: `circlechat/github/protect-repo.sh` sets up each repo on the command line the way the plan repos are set up.

- **Two rulesets on the default branch.** "Protect main" stops deletion and force pushes, and each change arrives in a pull request. "Only admins merge" lets only a repo admin merge. A ruleset with the same name is updated in place.
- **Secret scanning with push protection, Dependabot alerts and security updates.**
- **A read-only workflow token,** unable to approve a pull request.
- **Branch deletion after each merge, and forking off for a private repo.**
- **A pull request that adds `dependabot.yml`,** for the repo's package systems, when the repo has none.

The script asks for a one-day token with `read -rs`, and uses the token only through `GH_TOKEN`. The script changes only the repos on the script's command line. The script then prints a table of each setting, read back from GitHub.
