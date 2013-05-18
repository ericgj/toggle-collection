var Emitter = require('emitter')
  , Enumerable = require('enumerable')
  , delegates = require('delegates')
  , classes  = require('classes')
  , indexof  = require('indexof')

module.exports = ToggleCollection;

function ToggleCollection(el){
  if (!(this instanceof ToggleCollection)) return new ToggleCollection(el);
  this.el = (typeof el == 'string' ? document.querySelector(el) : el);
  this.target(function(e){ return e;});
  this.models = [];
  this.reset();
  return this;
}

ToggleCollection.model = Model;

Emitter(ToggleCollection.prototype);
Enumerable(ToggleCollection.prototype);

ToggleCollection.prototype.__iterate__ = function(){
  var self = this;
  return {
    length: function() { return self.models.length; },
    get:    function(i){ return self.models[i]; }
  }
}

ToggleCollection.prototype.target = function(fn){
  this._target = fn;
  return this;
}

ToggleCollection.prototype.store = function(store){
  var models = valuesOf(store.getAll());
  if (models.length > 0){
    this.deselectAll();
    this.models = [];
    for (i=0;i<models.length;++i){
      this.models.push(Model.load(models[i]));
    }
    this.refresh();
  }
  this.off('change', this._store);
  this._store = function(model){ store.set(model.id, model); };
  this.on('change', this._store); 
  return this;
}

ToggleCollection.prototype.toggleOn = function(event,states){
  this.reset();
  this.states = states;
  this.events.bind(event, 'onToggle');
  return this;
}

ToggleCollection.prototype.onToggle = function(e){
  var el = this._target(e.target)
    , id = getAttr(el,'data-id');

  // should be an indexed search or hash, or use Set
  var model = this.find(function(m){ return m.id == id; });

  if (model) {
    this.toggle(model);
  } else {
    model = new Model(el, this.states);
    this.models.push(model);
    this.toggle(model);
  }
  return this;
}

ToggleCollection.prototype.toggle = function(model){
  model.toggleState();
  this._emitModel(model);
  return this;
}

ToggleCollection.prototype.select = function(model,state){
  i = (state ?  indexof(this.states, state) : 1);  // default == first state after initial
  if (i<0) throw new RangeError("Unknown state '" + state + "'.");
  model.setState(i);
  this._emitModel(model);
  return this;
}

ToggleCollection.prototype.deselect = function(model){
  model.setState(0);
  this._emitModel(model);
  return this;
}

ToggleCollection.prototype.selectAll = function(){
  this.each( this.select.bind(this) );
}

ToggleCollection.prototype.deselectAll = function(){
  this.each( this.deselect.bind(this) );
}

// call when DOM changes and you want to maintain toggle state

ToggleCollection.prototype.refresh = function(){
  var parentEl = this.el;
  this.each( function(model){
    var el = parentEl.querySelector('[data-id="'+model.id+'"]');
    if (el){
      model.el = el;
      model.refresh();
    }
  });
  return this;
}

// note this completely unbinds events (until the next toggleOn)
// more typically you'd simply call deselectAll()

ToggleCollection.prototype.reset = function(){
  this.deselectAll();
  this.models = [];
  this.events = this.events || delegates(this.el, this);
  this.events.unbind();
  return this;
}

ToggleCollection.prototype._emitModel = function(model){
  var state = model.state()
    , i = model.cursor;
  this.emit('change',model);
  if (i>0){
    this.emit('select', model, state);
    this.emit(state, model);
  } else {
    this.emit('deselect', model, state);
  }
}



function Model(el, states){
  this.el = el;
  this.data = (el ? extractData(el) : {})
  this.id = this.data.id;
  this.states = states || [];
  this.cursor = 0;
  return this;
}

Model.prototype.state = function(){
  return this.states[this.cursor];
}

Model.prototype.toggleState = function(){
  return this.setState( (this.cursor + 1) % this.states.length )
}

Model.prototype.setState = function(n){
  this.cursor = (n % this.states.length);
  this.refresh();
  return this;
}

Model.prototype.refresh = function(){
  var elClasses = classes(this.el);
  for (i=0;i<this.states.length;++i){
    if (i != this.cursor) elClasses.remove(this.states[i]);
  }
  if (this.state()) elClasses.add(this.state());
  return this;
}

Model.prototype.toJSON = function(){
  return {
    id: this.id,
    states: this.states,
    cursor: this.cursor,
    data: this.data
  }
}

Model.load = function(obj){
  var model = new Model();
  model.id = obj.id;
  model.states = obj.states;
  model.cursor = obj.cursor;
  model.data = obj.data;
  return model;
}


// private

function extractData(el){
  var attribs = el.attributes
    , obj  = {}
  for ( i=0; i<attribs.length; ++i){
    var parts = attribs[i].name.split('-'),
        first = parts.shift(),
        rest = parts.join('-');
    if (first == 'data') obj[rest] = attribs[i].value;
  }
  return obj;
}


//  Note: inlined from component/object

var has = Object.prototype.hasOwnProperty;

var valuesOf = Object.values || function(obj){
  var vals = [];
  for (var key in obj){
    if (has.call(obj,key)) vals.push(obj[key])
  }
  return vals;
}

//  Note: inlined from javve/get-attribute

/**
 * Return the value for `attr` at `element`.
 *
 * @param {Element} el
 * @param {String} attr
 * @api public
 */

var getAttr = function(el, attr) {
  var result = (el.getAttribute && el.getAttribute(attr)) || null;
  if( !result ) {
    var attrs = el.attributes;
    var length = attrs.length;
    for(var i = 0; i < length; i++) {
      if (attr[i] !== undefined) {
        if(attr[i].nodeName === attr) {
          result = attr[i].nodeValue;
        }
      }
    }
  }
  return result;
}
