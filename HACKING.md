# Hacking

## Requirements

* [node 10.15.0 or above](https://nodejs.org/en/)
* [npm 6.4.1 or above](https://www.npmjs.com/get-npm)
* [octant 0.16.1 or above](https://github.com/vmware-tanzu/octant)

## Quick Start

    git clone git@github.com:vmware-tanzu/octant-plugin-for-knative.git
    cd octant-plugin-for-knative
    npm ci                  # install dependencies
    npm run plugin:install  # build and install plugin

## Testing

We generally require tests be added for all but the most trivial of changes. You can run the tests using the commands below:

    npm test

## Developing

When making changes it can be helpful to have those changes trigger rebuilding the plugin. Octant will automatically detect updated plugins and apply the new behavior:

    npm run plugin:watch

> Note: do not leave this command running when putting a computer to sleep for an extended period (like overnight). Your computer may have trouble waking.

## Project Structure

- ./src/knative.js      # the main entry point for this plugin
- ./src/serving.js      # Serving specific event and content handlers
- ./src/components      # custom component for this plugin that are not directly related to a specific resource
- ./src/serving/api.js  # defines the shape of Serving resources
- ./src/serving/*.js    # components for specific Serving resources

ActionHandlers respond to actions within the plugin, like submitting a form. ContentHandlers map a URLs to a rendered response looking up resources as needed. Factories are ideally pure conversion of Kubernetes resources into component views.

## Before Your Pull Request

When you are ready to create your pull request, we recommend running `npm test`, installing the plugin `npm run plugin:install` and testing with each version of Octant the plugin supports, or at least the latest stable Octant release.
