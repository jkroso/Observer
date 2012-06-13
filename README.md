# Observer

An AMD pub/sub module with hierarchical topic structure

## Getting Started
Download the [production version][min] or the [development version][max].

[min]: https://raw.github.com/Jake/Observer/master/dist/Observer.min.js
[max]: https://raw.github.com/Jake/Observer/master/dist/Observer.js

## Documentation
Interface is similar to _Amplify.core_ except you can recursively create sub topics. To do so you just seperate subtopics with fullstops.

e.g.:
	`subject.publish('level1.level2.level3.etc...')` 

This would trigger the subscriptions on level3 followed by level2, level1, and the global channel.

###Other differences:

+ Multiple arguments can not be passed to subscriptions, I suggest you use a wrapper object for this.
+ Priority defaults to 0. And a subscription of priority 10 will come before a priority 1. Just the opposite of `Amplify.core`. If you need a subscription to be called later than default use a negative priority, up to `Infinity` if required. Subscriptions with the same priority will be called in the order they were subscribed.
+ Multiple topics can be unsubscribed and subscribed at the same time. `Amplify.core` only lets you do this when subscribing. When possible you should use this feature on subscriptions as it ends up conserving memory.
+ A `run` method is also available which bypasses the topic structuring code and simply looks for the topic you specified and triggers its listeners. This behaves exactly the same as `Amplify.publish' and is significantly quicker.
+ The full subscribed object is return from 'subject.subscribe' not just the callback. You can use this object to pass as a reference when unsubscribing all the same as `Amplify.core`. However, you can also attatch whatever funky behaviour you like to its `trigger` method.
+ There may be some other minor differences I have forgotten.

## Examples
_(Coming soon)_

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [grunt](https://github.com/cowboy/grunt).

_Also, please don't edit files in the "dist" subdirectory as they are generated via grunt. You'll find source code in the "src" subdirectory!_

## Release History
_(Nothing yet)_

## License
Copyright (c) 2012 Jakeb Rosoman  
Licensed under the MIT license.
