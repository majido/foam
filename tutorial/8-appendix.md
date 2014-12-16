---
layout: tutorial
permalink: /tutorial/8-appendix/
tutorial: 7
---

This appendix introduces further details about some parts of FOAM that aren't necessary for the main tutorial.

## Properties

### Properties-on-properties

Properties are objects too, which means they have their own methods and
properties.

Several of these "properties on properties" are very useful when writing your
own classes. Here are some of them, in roughly descending order of usefulness:

- `postSet: function(old, nu) { ... }` is called with the old and new values of
  this property, after it has changed.
- `preSet: function(old, nu) { ... }` is called with the old and new values of
  the property when it's *about* to change. The return value of `preSet` is the
  value which is actually stored.
- `defaultValue`: Provide a fixed default value for this property. It won't
  actually be stored on each object, saving memory and bandwidth.
- `defaultValueFn: function() { ... }`: A function that's called *every time*
  the default value is required. Can use `this` to refer to the instance in
  question, so you can compute the default based on some other properties.
- `factory: function() { ... }` is called once during `init` after creating a
  new object, the value returned becomes the value of this property.
    - This is commonly used as `factory: function() { return []; }` to make each
      object have its own empty array. `defaultValue: []` would make all
      instances share one array!
- `view` specifies the view that should be used to render this property.
  Defaults to `TextFieldView` for properties with no specified `model_`.
  Properties with eg. `StringArrayProperty` as their model may have other
  defaults.
  - You can specify the `view` in several ways, the commonest two are:
    - By name: `view: 'DAOListView'`
    - With a "factory" object:
      `{ factory_: 'DAOListView', rowView: 'MyCitationView' }`
- `required: true` indicates that this field is required for the model to
  function correctly.
- `transient: true` indicates that this field should not be stored by DAOs.
- `hidden: true` indicates that this field should not be rendered by views.
- `label: 'string'` gives the label that views should use to label this
  property, if applicable. Defaults to `this.name`, naturally.
- `help: 'string'` explanatory help text for this property, which could go in a
  tooltip.
- `documentation`: Gives developer documentation for this property.
- `getter: function() { ... }` is called each time the property is accessed, and
  its return value is the value of the property.
  - When this is used, the property is a "pseudoproperty" that has no real
    value, and therefore no value is stored.
- `setter: function(nu) { ... }` is called to set the value of the property.
  - See above about pseudoproperties.
- `dynamicValue: function() { ... }` is passed to `Events.dynamic`, which turns
  this property into a spreadsheet cell. The function you provide will be re-run
  every time any of its inputs changes, and the return value becomes the value
  of the property.
- `aliases: ['string', 'array']` defines other names for this property. They can
  be used as if they were real properties, but they access the same underlying
  value.

There are some more having to do with tables, i18n, autocomplete and more. See `core/mm2Property.js` for the complete definition of `Property`. `core/mm3Types.js` adds `IntProperty` and friends, and some of those have more properties specific to their type.

### Property Binding

For every property `foo` on a FOAM object, there is a `foo$` which is a "Value"
for the property. Setting two objects to share this Value, rather than the
literal value, is like passing by reference instead of by value. To illustrate:

{% highlight js %}
var o1 = Foo.create({ bar: 'abc' });
var o2 = Foo.create({ bar: o1.bar });
console.log(o1.bar);        // prints 'abc'
o2.bar = 'def';
console.log(o2.bar);        // 'def'
console.log(o1.bar);        // 'abc'
{% endhighlight %}

In the above, the value of `o1.bar` is copied to `o2.bar`. In the below,
`o1.bar` and `o2.bar` are the same underlying property:

{% highlight js %}
var o1 = Foo.create({ bar: 'abc' });
var o2 = Foo.create({ bar$: o1.bar$ });
console.log(o1.bar);        // prints 'abc'
o2.bar = 'def';
console.log(o2.bar);        // 'def'
console.log(o1.bar);        // 'def'
{% endhighlight %}

This makes it convenient to eg. bind a view to a property from a larger class.

### Listening to Properties

In addition to things like `setter` and `postSet`, you can listen for updates to
any property, like so:

{% highlight js %}
foo.bar$.addListener(function(object, topic, oldValue, newValue) { ... });
{% endhighlight %}

- `object` is the object this property belongs to. It serves as `this`,
  effectively.
- `topic` is the reason for the event. For a property listener, it's always the
  property's name.
- `oldValue` is the value from before the change.
- `newValue` is the value after the change.

This functionality is used by things like `Events.dynamic` to register listeners
on properties changing.

### Property Types

We showed `IntProperty` above; there are many more types of properties. Most you
can easily guess what they do:

`StringProperty`, `BooleanProperty`, `DateProperty`, `DateTimeProperty`,
`IntProperty`, `FloatProperty`, `FunctionProperty`, `ArrayProperty`,
`ReferenceProperty`, `StringArrayProperty`, `DAOProperty`,
`ReferenceArrayProperty`.

There are many more; most of these are defined in `core/mm3Types.js`.

## Methods on the Class

On classes themselves, statically, there are a handful of useful methods and
properties.

- `SomeClass.name` is the name of the class.
- `SomeClass.create()` creates a new instance of the class.
- `SomeClass.isInstance(o)` checks if `o` is an instance of the class (or a
  subclass).
- `SomeClass.isSubModel(OtherClass)` returns `true` if `OtherClass` is a
  descendant of `SomeClass`.

## Listeners

Listeners are like methods, but `this` is always bound to the object, making
them easier to pass as event handlers.

{% highlight js %}
CLASS({
  name: 'Mouse',
  properties: [ 'x', 'y' ],
  methods: {
    connect: function(element) {
      element.addEventListener('mousemove', this.onMouseMove);
    }
  },

  listeners: [
    {
      name: 'onMouseMove',
      code: function(evt) {
        this.x = evt.offsetX;
        this.y = evt.offsetY;
      }
    }
  ]
});
{% endhighlight %}

The listener is attached to the object like a normal method, which can be called
directly with `this.onMouseMove()`. Under the hood, however, there are several
differences.

- Listeners always have `this` bound properly, so they can be passed as
callbacks, as above, without being explicitly bound.
- Listeners can be merged, or batched. The first event that comes in starts the
  clock, when the timer expires, your code is called *once* with the *most
  recent* event.
  - `isMerged: 100` will merge events and fire the real code 100ms after the
    *first* event arrives. After that time expires, another event arriving will
    start the clock again. This is useful to avoid spamming database or network
    updates.
  - `isFramed: true` will merge events and fire your code on the next animation
    frame. This is useful to avoid redrawing more than once per frame. Your
    code receives the most recent event, same as `isMerged`.


## Actions

Actions are guarded, GUI-friendly methods. FOAM will run code you supply to
determine whether the button for this action should be hidden, visible but
disabled, or enabled.

{% highlight js %}
CLASS({
  // ...
  actions: [
    {
      name: 'start',
      label: 'Start' Process',
      help: 'Start the timer',
      isAvailable: function() { return true; },
      isEnabled:   function() { return ! this.isStarted; },
      action:      function() { this.isStarted = true; }
    }
  ],
  // ...
});
{% endhighlight %}

By default, an action is always visible and enabled (so the `isAvailable` above
is unnecessary). This button is always visible but only enabled when
`this.isStarted` is false. When the button is clicked while enabled, `action` is
called. If the button is disabled, nothing happens on a click.


## Methods on all objects

FOAM includes several properties and methods on all objects:

- `model_`: Every object has a pointer to its `Model`. This is the Javascript
  representation of its class, the same object you passed to `CLASS()`.
    - These representations have their own model, `Model`.
- `o.equals(x)` compares `o` and `x`
- `o.compareTo(x)` returns the usual -1, 0 or 1.
- `o.hashCode()` is similar to Java.
- `o.diff(x)` returns a diff of `o` against `x`, property by property.
- `o.clone()` returns a shallow copy of `o`.
- `o.deepClone()` is of course a deep copy.
- `o.toJSON()` and `o.toXML()` return JSON or XML as a string. Parsers are
  included to read them in again.
- `o.write(document)` writes the default view of the object into the document.

## DAOs

The DAO interface looks like this, if you pretend Javascript supports interfaces:

{% highlight js %}
interface DAO extends Sink {
  void   put(obj, opt_sink);
  void   remove(id, opt_sink);
  void   find(query, sink);
  Future select(sink);
  Future removeAll(query, sink);
  Future update(expression);
  void   listen(sink);
  void   pipe(sink):  // select() + listen()
  void   unlisten(sink);
  DAO    where(query);
  DAO    limit(count);
  DAO    skip(count);
  DAO    orderBy(comparators...);
}
{% endhighlight %}

a `Sink` looks like this:

{% highlight js %}
interface Sink {
  void put(obj);
  void remove(obj);
  void eof();
  void error(msg);
}
{% endhighlight %}

Note that every DAO is therefore also a Sink, making it trivial to pull data
from one DAO into another: `sourceDAO.select(targetDAO)`.

Here's an example of using the DAO interface to make a query:

{% highlight js %}
dao
  .skip(200)
  .limit(50)
  .orderBy(EMail.TIMESTAMP)
  .where(
    AND(
      EQ(EMail.TO,        'kgr@google.com'),
      EQ(EMail.FROM,      'adamvy@google.com'),
      GT(EMail.TIMESTAMP, startOfYear)))
  .select(
    GROUP_BY(EMail.SUBJECT, COUNT()));
{% endhighlight %}

This is generally SQL-like, but instead of parsing a string it constructs the
query directly. This has no parsing overhead, and completely avoids SQL
injection. It also adds some typechecking, though Javascript can only take that
so far.

This query syntax works on all DAOs, including plain Javascript arrays. It is
also extensible - the `MLang` syntax - `AND`, `EQ`, and so on - are simple
expressions, and you can write new ones if needed.
