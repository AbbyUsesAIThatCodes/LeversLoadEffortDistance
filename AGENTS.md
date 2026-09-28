# Contributor Instructions

Keep one implementation PR at a time. Review before merging or deploying.
Preserve the classroom mass-distance equation, existing save key, continuous
motion during edits, and parity between WebGL and the fallback diagram.

Apply [Build Identity](docs/BUILD_IDENTITY.md) to every artifact-producing
invocation. Use `npm run build` and its manifest-derived output folder; never
invent or reuse a PR build ordinal. Test with `npm test`, then run focused
browser checks for changed interactions on student laptop/projector dimensions.
Use Title Case for new or edited interface headings and feature titles.
