/**
 * @license
 * Copyright 2014 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// Extend this View when making alternate RowViews in order to inherit the removeRow action.
// TODO: consider inheriting actions from parent and/or Context instead.

CLASS({
  name: 'DefaultRowView',
  extendsModel: 'View',

  imports: [ 'removeRowFromList' ],

  properties: [
    {
      name: 'data'
    },
    {
      name: 'className',
      defaultValue: 'DefaultRowView'
    }
  ],

  templates: [
    function CSS() {/*
      .DefaultRowView {
        white-space: nowrap;
      }
    */},
    function toInnerHTML() {/* %%data $$removeRow */}
  ],

  actions: [
    {
      name: 'removeRow',
      label: '',
      iconUrl: 'images/ic_clear_black_24dp.png',
      action: function() { this.removeRowFromList(this.data); }
    }
  ]

});


CLASS({
  name: 'DefaultACRowView',
  extendsModel: 'View',

  properties: [ 'data' ],

  templates: [
    function toInnerHTML() {/* %%data.id */}
  ]
});


CLASS({
  name: 'AddRowView',
  extendsModel: 'View',
  traits: ['PositionedDOMViewTrait', 'VerticalScrollNativeTrait'],

  imports: [
    'addRowToList',
    'rowView',
    'setTimeout',
    'stack'
  ],

  properties: [
    {
      name: 'data'
    },
    {
      model_: 'DAOProperty',
      name: 'dao',
      view: {
        factory_: 'DAOListView',
        className: 'rows',
        tagName: 'div',
        useSelection: true
      }
    },
    {
      // TODO: DAO should be pre-limited instead
      name: 'limit',
      defaultValue: 40
    },
    {
      name: 'className',
      defaultValue: 'AddRowView'
    },
    {
      name: 'bodyId',
      factory: function() { return this.nextID(); }
    },
    {
      name: 'scrollerID',
      factory: function() { return this.nextID(); }
    }
  ],

  templates: [
    function CSS() {/*
      .AddRowView {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        background: #e1e1e1;
        overflow: hidden;
      }
      .AddRowView .arvHeader {
        display: flex;
        align-items: center;
        border-bottom: 1px solid #d2d2d2;
        background: #fff;
        flex-grow: 0;
        flex-shrink: 0;
      }
      .AddRowView .arvBody {
        flex-grow: 1;
        overflow-y: auto;
      }
      .AddRowView canvas {
        background: #3e50b4;
      }
      .AddRowView input {
        outline: none;
        border: none;
        font-size: 17px;
        flex-grow: 1;
        margin: 0 0 0 12px;
        padding: 0;
      }
      .AddRowView .rows {
        width: 100%;
        border: none;
      }
      .AddRowView .rows-row {
        padding: 0 12px 0 16px;
      }
    */},
    function toInnerHTML() {/*
      <div class="arvHeader">
        $$close $$data
      </div>
      <div class="arvBody" id="%%bodyId">
        $$dao{ rowView: this.rowView }
      </div>
    */}
  ],

  methods: {
    initHTML: function() {
      this.SUPER();

      this.data$.addListener(function() { this.close(); }.bind(this));
      this.softValue = DomValue.create(this.dataView.$, 'input');
      this.softValue.addListener(function() {
        var data = this.softValue.get();
        var src  = this.X.dao.limit(this.limit);
        var dao  = src.where(data ? this.X.queryFactory(data) : TRUE);

        var self = this;
        dao.limit(2).select()(function(objs) {
          self.dao = ( objs.length === 1 && objs[0].id === data /* self.f(objs[0]) === data */ ) ? src.where(FALSE) : dao;
        });
      }.bind(this));
      this.dao = this.X.dao.limit(this.limit);
    },

    initInnerHTML: function() {
      this.SUPER();

      this.daoView.selection$.addListener(function(_, _, _, data) {
        this.data = data.id;
      }.bind(this));
    }
  },

  actions: [
    {
      name: 'close',
      label: '',
      iconUrl: 'images/ic_arrow_back_24dp.png',
      action: function() {
        // Don't close twice.
        if ( this.closed_ ) return;
        this.closed_ = true;

        // Hack: If you click on one of the labels the data will be updated twice:
        //  once when then text field gets the onBlur event and once when
        //  selecting the label sets it.  In this case, we only want the second
        //  value which will contain the full label text.  So we delay by a bit to give
        //  the second update time to happen.
        this.setTimeout(function() {
          this.addRowToList(this.data);
          this.stack.back();
        }.bind(this), 150);
      }
    }
  ]
});


// TODO: Take auto-complete information from autocompleter in Property.
CLASS({
  name: 'AutocompleteListView',
  extendsModel: 'View',

  requires: [ 'AddRowView' ],
  imports: [ 'stack' ],
  exports: [
    'acRowView as rowView',
    'addRowToList',
    'queryFactory',
    'removeRowFromList',
    'srcDAO as dao'
  ],

  properties: [
    {
      name: 'data',
      postSet: function(oldValue, newValue) {
        this.updateHTML();
      }
    },
    {
      model_: 'DAOProperty',
      name: 'srcDAO'
    },
    {
      name: 'queryFactory'
    },
    {
      name: 'prop'
    },
    {
      name: 'label',
      defaultValueFn: function() { return this.prop ? this.prop.label : ''; }
    },
    {
      model_: 'ViewProperty',
      name: 'acRowView',
      defaultValue: 'DefaultACRowView'
    },
    {
      model_: 'ViewProperty',
      name: 'rowView',
      defaultValue: 'DefaultRowView'
    },
    {
      name: 'className',
      defaultValue: 'AutocompleteListView'
    },
    {
      name: 'tagName',
      defaultValue: 'div'
    },
    {
      name: 'extraClassName',
      defaultValueFn: function() { return Array.isArray(this.data) ? ' array' : ' single'; }
    },
  ],

  templates: [
    // TODO: cleanup CSS
    function CSS() {/*
      .AutocompleteListView {
        padding: 0 0 12px 16px;
        width: 100%;
        border: none;
        position: inherit;
      }
      .AutocompleteListView .acHeader {
        color: #999;
        font-size: 14px;
        font-weight: 500;
        padding: 0 0 16px 0;
        display: flex;
        align-items: center;
        margin-top: -16px;
        padding-bottom: 0;
        flex: 1 0 auto;
      }
      .AutocompleteListView .acHeader .acLabel {
        flex: 1 0 auto;
      }
      .AutocompleteListView .acHeader canvas {
        opacity: 0.76;
      }
      .AutocompleteListView .single canvas {
        display: none;
      }
    */},
    function toInnerHTML() {/*
      <% var isArray = Array.isArray(this.data); %>
      <div class="acHeader"><div class="acLabel">%%label</div><% if ( isArray ) { %> $$addRow <% } %></div>
      <% if ( isArray ) { %>
        <% for ( var i = 0 ; i < this.data.length ; i++ ) {
          var d = this.data[i]; %>
          <div><%= this.rowView({data: d}, this.X) %></div>
        <% } %>
      <% } else { %>
        <div id="<%= this.on('click', function() { self.addRow(); }) %>" <%= this.rowView({data: this.data}, this.X) %></div>
      <% } %>
    */}
  ],

  methods: {
    addRowToList: function(d) {
      if ( d ) this.data = Array.isArray(this.data) ? this.data.union([d]) : d;
    },
    removeRowFromList: function(d) { this.data = this.data.deleteF(d); }
  },

  actions: [
    {
      name: 'addRow',
      label: '',
      iconUrl: 'images/ic_add_24dp.png',
      action: function() {
        var view = this.AddRowView.create();
        this.stack.pushView(view);
        view.focus();
      }
    }
  ]
});
