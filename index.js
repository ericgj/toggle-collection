var Emitter = require('emitter')
  , Enumerable = require('enumerable')
  , delegates = require('delegates')
  , classes  = require('classes')
  , indexof  = require('indexof')

module.exports = ToggleCollection;

function ToggleCollection(el){
  if (!(this instanceof ToggleCollection)) return new ToggleCollection(el);
  this.el = (typeof el == 'string' ? document.querySelector(el) : el);
  this.reset();
  return this;
}

Emitter(ToggleCollection.prototype);
Enumerable(ToggleCollection.prototype);

ToggleCollection.prototype.__iterate__ = function(){
  var self = this;
  return {
    length: function() { return self.models.length; }
    get:    function(i){ return self.models[i]; }
  }
}

ToggleCollection.prototype.toggleOn = function(event,states){
  this.reset();
  this.events.bind(event, 'onToggle');
  this.states = states;
  return this;
}

ToggleCollection.prototype.onToggle = function(e){
  var el = e.target
    , id = getAttr(el,'data-id');

  // should be an indexed search or hash, or use Set
  var model = this.find(function(model){ model.id == id });

  if (model) {
    this.toggle(model);
  } else {
    model = new Model(el, this.states);
    this.models.push(model);
    this.toggle(model);
  }
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

// call when DOM changes and you want to maintain toggle state

ToggleCollection.prototype.refresh = function(){
  this.each( function(model){
    var el = document.querySelector('[data-id="'+model.id+'"');
    if (el){
      model.el = el;
      model.refresh();
    }
  });
  return this;
}

ToggleCollection.prototype.reset = function(){
  this.models = [];
  this.events = this.events || delegates(this.el, this);
  this.events.unbind();
  return this;
}

ToggleCollection.prototype._emitModel = function(model){
  var state = model.state()
    , i = model.cursor;
  if (i>0){
    this.emit('select', model, state);
    this.emit(state, model);
  } else {
    this.emit('deselect', model);
  }
}



function Model(el, states){
  this.el = el;
  this.data = {}
  extendWithData(this.data, el);
  this.id = this.data.id;
  this.states = states;
  this.cursor = 0;
  return this;
}

Model.prototype.state = function(){
  this.states[this.cursor];
}

Model.prototype.toggleState = function(){
  this.setState( (this.cursor + 1) % this.states.length )
}

Model.prototype.setState = function(n){
  this.cursor = (n % this.states.length);
  this.refresh();
}

Model.prototype.refresh = function(){
  var elClasses = classes(this.el);
  for (i=0;i<this.states.length;++i){
    if (i != this.cursor) elClasses.remove(this.states[i]);
  }
  elClasses.add(this.state);
}

// private

function extendWithData(obj, el){
  var attribs = el.attributes;
  for ( i=0; i<attribs.length; ++i){
    var parts = attribs[i].name.split('-'),
        first = parts.shift,
        rest = parts.join('-');
    if (first == 'data') obj[rest] = attribs[i].value;
  }
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
