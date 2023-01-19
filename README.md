# VMware has ended active development of this project, this repository will no longer be updated.
# Octant Plugin for Knative

![CI](https://github.com/vmware-tanzu/octant-plugin-for-knative/workflows/CI/badge.svg?branch=main)

Octant Plugin for Knative provides the ability to view, manage, create and delete Knative Service resources within Octant.
After installing, Octant will automatically detect the new plugin and add a 'Knative' section to the navigation bar.

## Try it out

Runtime prerequisites:
- Octant 0.16.1+
- a Kubernetes 1.15+ cluster
- Knative Serving 0.16+
- Knative Eventing 0.19.3+
- Knative Discovery API v0.20.0+
  - With knative source cluster duck type installed

### Install
```
curl -L https://github.com/vmware-tanzu/octant-plugin-for-knative/releases/download/v0.3.0/knative-0.3.0.js -o ~/.config/octant/plugins/knative.js
```
Using the [latest release](https://github.com/vmware-tanzu/octant-plugin-for-knative/releases/latest) is recommended.

### Build from source

Build prerequisites:
- Node JS 12.0+

Install node dependencies, run:

```
npm ci
```

To build and install the plugin, run:

```
npm run plugin:install
```

### Uninstall

```
rm ~/.config/octant/plugins/knative.js
```

## Contributing

Contributors will need to sign a DCO (Developer Certificate of Origin) with all changes. We also ask that a changelog entry is included with your pull request. Details are described in our [contributing](CONTRIBUTING.md) documentation.

See our [hacking](HACKING.md) guide for getting your development environment setup.

## Acknowledgements

This plugin was scaffolded using [wwitzel3/generator-octant-plugin](https://github.com/wwitzel3/generator-octant-plugin) and [Yeoman](http://yeoman.io).

## License

Apache License v2.0: see [LICENSE](./LICENSE.txt) for details.
