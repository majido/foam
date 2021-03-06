CLASS({
  name: 'AbstractAdapterDAO',
  extendsModel: 'ProxyDAO',
  help: 'An abstract decorator for adapting a DAO of one data type to another data type.  Extend this class and implement aToB() and bToA().',

  methods: {
    adaptKey_: function(key) {
      // Usually the primary key doesn't need to be adapted.
      return key;
    },
    put: function(obj, sink) {
      obj = this.aToB(obj);
      this.SUPER(obj, sink);
    },
    remove: function(obj, sink) {
      obj = this.aToB(obj);
      this.SUPER(obj, sink);
    },
    select: function(sink, options) {
      var self = this;
      sink = this.decorateSink_(sink, options);
      var mysink = {
        put: function(o, s, fc) {
          o = self.bToA(o);
          sink && sink.put && sink.put(o, s, fc);
        },
        eof: function() {
          sink && sink.eof && sink.eof();
        }
      };
      options = this.adaptOptions_(options);
      var future = afuture();
      this.SUPER(mysink, options)(function() { future.set(sink); });
      return future.get;
    },
    find: function(key, sink) {
      var self = this;
      this.SUPER(this.adaptKey_(key), {
        put: function(o) {
          sink && sink.put && sink.put(self.bToA(o));
        },
        error: function() {
          sink && sink.error && sink.error.apply(sink, arguments);
        }
      });
    },
    removeAll: function(sink, options) {
      options = this.adaptOptions_(options);
      var self = this;
      var mysink = {
        remove: function(o, sink, fc) {
          sink && sink.remove && sink.remove(self.bToA(o), sink, fc);
        },
        error: function() {
          sink && sink.error && sink.error.apply(sink, arguments);
        }
      };
      this.SUPER(mysink, options);
    },
    listen: function(s, options) {
      if ( options ) var myoptions = this.adaptOptions_(options);
      var self = this;
      var mysink = {
        $UID: s.$UID,
        put: function(o, sink, fc) {
          s.put && s.put(self.bToA(o), sink, fc);
        },
        remove: function(o, sink, fc) {
          s.remove && s.remove(self.bToA(o), sink, fc);
        },
        error: function() {
          s.error && s.error.apply(s, arguments);
        }
      };
      s = this.decorateSink_(s, options, true);
      this.SUPER(mysink, myoptions);
    }
  }
});


CLASS({
  extendsModel: 'AbstractDAO',

  name: 'AbstractFileDAO',

  properties: [
    {
      name:  'model',
      type:  'Model',
      requred: true
    },
    {
      name:  'filename',
      label: 'Storage file name',
      type:  'String',
      defaultValueFn: function() {
        return this.model.plural;
      }
    },
    {
      name:  'type',
      label: 'Filesystem Type',
      type:  'String',
      view: { factory_: 'ChoiceView', choices: ['Persistent', 'Temporary'] },
      defaultValue: 'Persistent'
    }
  ],

  methods: {
    init: function() {
      this.SUPER();

      var self = this;

      var withEntry = amemo(aseq(
        function(ret) {
          window.webkitStorageInfo.requestQuota(
            self.type === 'Persistent' ? 1 : 0,
            1024 * 1024 * 200, // 200 MB should be fine.
            function() { ret(1024 * 1024 * 200); },
            console.error.bind(console));
        },
        function(ret, quota) {
          window.requestFileSystem(
            self.type === 'Persistent' ? 1 : 0,
            quota, /* expected size*/
            ret,
            console.error.bind(console));
        },
        function(ret, filesystem) {
          filesystem.root.getFile(
            self.filename,
            { create: true },
            ret,
            console.error.bind(console));
        }));


      this.withWriter = amemo(aseq(
        withEntry,
        function(ret, entry) {
          entry.createWriter(ret, console.error.bind(console));
        })),


      this.withStorage = amemo(aseq(
        withEntry,
        function(ret, entry) {
          entry.file(ret, console.error.bind(console));
        },
        function(ret, file) {
          var reader = new FileReader();
          var storage = {};

          reader.onerror = console.error.bind(console);
          reader.onloadend = function() {
            self.parseContents_(ret, reader.result, storage);
          };

          this.readFile_(reader, file);
        }));
    },

    put: function(obj, sink) {
      var self = this;
      this.withStorage(function(s) {
        s.put(obj, {
          __proto__: sink,
          put: function() {
            sink && sink.put && sink.put(obj);
            self.notify_('put', [obj]);
            self.update_('put', obj);
          }
        });
      });
    },

    find: function(key, sink) {
      this.withStorage(function(s) {
        s.find(key, sink);
      });
    },

    remove: function(obj, sink) {
      var self = this;
      this.withStorage(function(s) {
        s.remove(obj, {
          __proto__: sink,
          remove: function(obj) {
            self.__proto__.remove && self.__proto__.remove(obj);
            self.notify_('remove', [obj]);
            self.update_('remove', obj);
          }
        });
      });
    },

    removeAll: function(sink, options) {
      var self = this;
      var future = afuture();
      this.withStorage(function(s) {
        var fut = s.removeAll({
          __proto__: sink,
          remove: function(obj) {
            self.__proto__.remove && self.__proto__.remove(obj);
            self.notify_('remove', [obj]);
            self.update_('remove', obj);
          }
        }, options);
        fut(future.set);
      });
      return future.get;
    },

    select: function(sink, options) {
      this.withStorage(function(s) {
        s.select(sink, options);
      });
    }
  }
});


CLASS({
  name: 'ActionFactoryDAO',
  extendsModel: 'ProxyDAO',
  label: 'ActionFactoryDAO',

  properties: [
    {
      name: 'actionDao',
      type: 'DAO',
      hidden: true,
      required: true
    }
  ],

  methods: {
    put: function(value, sink) {
      var self = this;
      aseq(
        function(ret) {
          self.delegate.find(value.id, {
            put: function(obj) {
              ret(obj);
            },
            error: function() { ret(); }
          });
        },
        function(ret, existing) {
          if (existing) {
            existing.writeActions(
              value,
              self.actionDao.put.bind(self.actionDao));
          } else if (value.model_.createActionFactory) {
            value.model_.createActionFactory(function(actions) {
              for (var j = 0; j < actions.length; j++)
                self.actionDao.put(actions[j]);
            }, value);
          }
          self.delegate.put(value, sink);
          ret();
        })(function() {});
    },
    remove: function(value, sink) {
      if (value.model_.deleteActionFactory) {
        var actions = value.model_.deleteActionFactory(value);
        for (var j = 0; j < actions.length; j++)
          this.actionDao.put(actions[j]);
      }
      this.delegate.remove(value, sink);
    }
  }
});



// TODO Why is this even a DAO, it literally only does find.
CLASS({
  name: 'BlobReaderDAO',

  properties: [
    {
      name: 'blob',
      type: 'Blob',
      required: true
    }
  ],
  methods: {
    put: function(value, sink) {
      sink && sink.error && sink.error("Unsupported");
    },

    remove: function(query, sink) {
      sink && sink.error && sink.error("Unsupported");
    },

    select: function(query, sink) {
      sink = sink || [].sink;
      sink && sink.error && sink.error("Unsupported");
    },

    find: function(key, sink) {
      var slice = this.blob.slice(key[0], key[0] + key[1]);
      var reader = new FileReader();
      reader.readAsText(slice);
      reader.onload = function(e) {
        sink && sink.put && sink.put(reader.result);
      };
      reader.onerror = function(e) {
        sink && sink.error && sink.error("find", e);
      };
    }
  }
});


CLASS({
  name: 'BlobSerializeDAO',
  extendsModel: 'ProxyDAO',

  properties: [
    {
      model_: 'ArrayProperty',
      name: 'properties',
      subType: 'Property'
    }
  ],

  methods: {
    serialize: function(ret, obj) {
      obj = obj.clone();
      var afuncs = [];
      for ( var i = 0, prop; prop = this.properties[i]; i++ ) {
        afuncs.push((function(prop) {
          return (function(ret) {
            if ( !obj[prop.name] ) {
              ret();
              return;
            }

            var reader = new FileReader();
            reader.onloadend = function() {
              var type = obj[prop.name].type;
              obj[prop.name] = 'data:' + type + ';base64,' + Base64Encoder.encode(new Uint8Array(reader.result));
              ret();
            }

            reader.readAsArrayBuffer(obj[prop.name]);
          });
        })(prop));
      }

      apar.apply(undefined, afuncs)(function() {
        ret(obj);
      });
    },

    deserialize: function(obj) {
      for ( var i = 0, prop; prop = this.properties[i]; i++ ) {
        var value = prop.f(obj);
        if ( !value ) continue;
        var type = value.substring(value.indexOf(':') + 1,
                                   value.indexOf(';'));
        value = value.substring(value.indexOf(';base64') + 7);
        var decoder = Base64Decoder.create([]);
        decoder.put(value);
        decoder.eof();
        obj[prop.name] = new Blob(decoder.sink, { type: type });
      }
    },

    put: function(o, sink) {
      var self = this;
      this.serialize(function(obj) {
        self.delegate.put(obj, sink);
      }, o);
    },

    select: function(sink, options) {
      var self = this;
      var mysink = {
        __proto__: sink,
        put: function() {
          var args = Array.prototype.slice.call(arguments);
          self.deserialize(args[0]);
          sink.put.apply(sink, args);
        }
      };
      var args = Array.prototype.slice.call(arguments);
      args[0] = mysink;
      this.delegate.select.apply(this.delegate, args);
    },

    find: function(q, sink) {
      var self = this;
      var mysink = {
        __proto__: sink,
        put: function() {
          var args = Array.prototype.slice.call(arguments);
          self.deserialize(args[0]);
          sink.put.apply(sink, args);
        }
      };
      this.delegate.find(q, mysink);
    }
  }
});


CLASS({
  name: 'BusyStatusDAO',
  extendsModel: 'ProxyDAO',
  imports: [
    'busyStatus'
  ],

  methods: {
    wrapSink: function(op, sink) {
      var comp = this.busyStatus.start();
      // NB: We must make sure that whenever anything is called on sink, this
      // is the original sink, not mysink. Otherwise eg. MDAO will fail, as it
      // writes things to mysink.instance_ and not sink.instance_.
      var mysink = {
        error: function() {
          comp();
          sink && sink.error && sink.error.apply(sink, arguments);
        },
        eof: op === 'select' || op === 'removeAll' ?
          function() { comp(); sink && sink.eof && sink.eof(); } :
          sink && sink.eof && sink.eof.bind(sink),
        put: op === 'put' || op === 'find' ?
          function(x) { comp(); sink && sink.put && sink.put(x); } :
          sink && sink.put && sink.put.bind(sink),
        remove: op === 'remove' ?
          function(x) { comp(); sink && sink.remove && sink.remove(x); } :
          sink && sink.remove && sink.remove.bind(sink)
      };

      return mysink;
    },
    select: function(sink, options) {
      return this.delegate.select(this.wrapSink('select', sink || [].sink), options);
    },
    put: function(obj, sink) {
      this.delegate.put(obj, this.wrapSink('put', sink));
    },
    remove: function(obj, sink) {
      this.delegate.remove(obj, this.wrapSink('remove', sink));
    },
    find: function(obj, sink) {
      this.delegate.find(obj, this.wrapSink('find', sink));
    },
    removeAll: function(sink, options) {
      return this.delegate.removeAll(this.wrapSink('removeAll', sink), options);
    }
  }
});


/**
 * Provide Cascading Remove.
 * Remove dependent children from a secondary DAO when parent is
 * removed from the delegate DAO.
 */
CLASS({
  name: 'CascadingRemoveDAO',
  label: 'Cascading Remove DAO',

  extendsModel: 'ProxyDAO',

  properties: [
    {
      name: 'childDAO',
      type: 'DAO',
      mode: "read-only",
      hidden: true,
      required: true,
      transient: true
    },
    {
      name: 'property',
      type: 'Property',
      required: true,
      hidden: true,
      transient: true
    }
  ],

  methods: {
    remove: function(query, sink) {
      this.childDAO.where(EQ(this.property, query)).removeAll();
      this.delegate.remove(query, sink);
    },
    removeAll: function(sink, options) {
      return apar(
        this.childDAO.removeAll(null, options), // TODO: Sane?
        this.delegate.removeAll(sink, options)
      );
    }
  }
});


CLASS({
  name: 'ContextualizingDAO',
  extendsModel: 'ProxyDAO',
  methods: {
    find: function(id, sink) {
      var X = this.X;
      this.delegate.find(id, {
        put: function(o) {
          // TODO: Remove this when all DAOs clone on  .find()
          o = o.clone();


          o.X = X;
          sink && sink.put && sink.put(o);
        },
        error: function() {
          sink && sink.error && sink.error.apply(sink, arguments);
        }
      });
    }
  }
});


CLASS({
  name: 'DefaultObjectDAO',
  help: 'A DAO decorator that will generate a default object if no object is found on a .find() call.',

  extendsModel: 'ProxyDAO',

  properties: [
    {
      name: 'factory',
      help: 'A factory method to construct the default object.'
    }
  ],

  methods: {
    find: function(q, sink) {
      var self = this;
      var mysink = {
        put: sink.put.bind(sink),
        error: function() {
          sink.put(self.factory(q));
        },
      };
      this.delegate.find(q, mysink);
    }
  }
});


/**
 * Apply this decorator to a DAO if you'd like to (for debugging purposes)
 * pretend that accesses are slow. Currently, only select has been targetted.
 */
CLASS({
  name: 'DelayedDAO',

  extendsModel: 'ProxyDAO',

  properties: [
    {
      model_: 'IntProperty',
      name: 'initialDelay'
    },
    {
      model_: 'IntProperty',
      name: 'rowDelay'
    }
  ],

  methods: {
    select: function(sink, options) {
      sink = sink || [];
      var f = afuture();
      var self = this;

      if ( Expr.isInstance(sink) ) {
        setTimeout(function() {
          self.delegate.select(sink, options)(f.set)
        }, this.initialDelay);
        return f.get;
      }


      var i = 0;
      var delayedSink = {
        pars: [],
        put: function() {
          var args = arguments;
          this.pars.push(
            function(ret) {
              setTimeout(function() {
                sink.put.apply(sink, args);
                ret()
              }, self.rowDelay * ++i );
            });
        },
        eof: function() {
          apar.apply(null, this.pars)(
            function() {
              sink && sink.eof && sink.eof();
              f.set(sink);
            });
        },
        error: function() {
          sink && sink.error && sink.error.apply(sink, arguments);
        }
      };

      setTimeout(function() {
        self.delegate.select(delayedSink, options)
      }, this.initialDelay);

      return f.get;
    }
  }
});


CLASS({
  name: 'ErrorDAO',
  extendsModel: 'AbstractDAO',
  methods: {
    put: function(obj, sink) {
      sink && sink.error && sink.error('put', obj);
    },
    remove: function(obj, sink) {
      sink && sink.error && sink.error('remove', obj);
    }
  }
});


CLASS({
  name: 'GDriveDAO',
  properties: [
    {
      name: 'authtoken',
      label: 'Authentication Token'
    }
  ],

  methods: {
    put: function(value, sink) {
    },
    remove: function(query, sink) {
    },
    select: function(sink, options) {
      sink = sink || [].sink;
      var xhr = new XMLHttpRequest();
      var params = [
        'maxResults=10'
      ];
      xhr.open(
        'GET',
        "https://www.googleapis.com/drive/v2/files?" + params.join('&'));
      xhr.setRequestHeader('Authorization', 'Bearer ' + this.authtoken);

      xhr.onreadystatechange = function() {
        if (xhr.readyState != 4) return;

        var response = JSON.parse(xhr.responseText);
        if (!response || !response.items) {
          sink && sink.error && sink.error(xhr.responseText);
          return;
        }

        for (var i = 0; i < response.items.length; i++) {
          sink && sink.put && sink.put(response.items[i]);
        }
      };
      xhr.send();
    },
    find: function(key, sink) {
    }
  }
});


/* Usage:
 * var dao = IDBDAO.create({model: Issue});
 * var dao = IDBDAO.create({model: Issue, name: 'ImportantIssues'});
 *
 * TODO:
 * Optimization.  This DAO doesn't use any indexes in indexeddb yet, which
 * means for any query other than a single find/remove we iterate the entire
 * data store.  Obviously this will get slow if you store large amounts
 * of data in the database.
 */
CLASS({
  name: 'IDBDAO',
  label: 'IndexedDB DAO',

  extendsModel: 'AbstractDAO',

  properties: [
    {
      name:  'model',
      type:  'Model',
      required: true
    },
    {
      name:  'name',
      label: 'Store Name',
      type:  'String',
      defaultValueFn: function() {
        return this.model.plural;
      }
    },
    {
      model_: 'BooleanProperty',
      name: 'useSimpleSerialization',
      defaultValue: true
    },
    {
      model_: 'StringArrayProperty',
      name: 'indicies'
    }
  ],

  methods: {

    init: function() {
      this.SUPER();

      if ( this.useSimpleSerialization ) {
        this.serialize = this.SimpleSerialize;
        this.deserialize = this.SimpleDeserialize;
      } else {
        this.serialize = this.FOAMSerialize;
        this.deserialize = this.FOAMDeserialize;
      }

      this.withDB = amemo(this.openDB.bind(this));
    },

    FOAMDeserialize: function(json) {
      return JSONToObject.visitObject(json);
    },

    FOAMSerialize: function(obj) {
      return ObjectToJSON.visitObject(obj);
    },

    SimpleDeserialize: function(json) {
      return this.model.create(json);
    },

    SimpleSerialize: function(obj) {
      var s = {};
      for ( var key in obj.instance_ ) {
        var prop = obj.model_.getProperty(key);
        if ( ! prop.transient ) s[key] = obj.instance_[key];
      }
      return s;
    },

    openDB: function(cc) {
      var indexedDB = window.indexedDB ||
        window.webkitIndexedDB         ||
        window.mozIndexedDB;

      var request = indexedDB.open("FOAM:" + this.name, 1);

      request.onupgradeneeded = (function(e) {
        var store = e.target.result.createObjectStore(this.name);
        for ( var i = 0; i < this.indicies.length; i++ ) {
          store.createIndex(this.indicies[i][0], this.indicies[i][0], { unique: this.indicies[i][1] });
        }
      }).bind(this);

      request.onsuccess = (function(e) {
        cc(e.target.result);
      }).bind(this);

      request.onerror = function (e) {
        console.log('************** failure', e);
      };
    },

    withStore: function(mode, fn) {
      if ( mode !== 'readwrite' ) return this.withStore_(mode, fn);

      var self = this;

      if ( ! this.q_ ) {
        var q = [fn];
        this.q_ = q;
        setTimeout(function() {
          self.withStore_(mode, function(store) {
            // console.log('q length: ', q.length);
            if ( self.q_ == q ) self.q_ = undefined;
            for ( var i = 0 ; i < q.length ; i++ ) q[i](store);
          });
        },0);
      } else {
        this.q_.push(fn);
        // Diminishing returns after 10000 per batch
        if ( this.q_.length == 10000 ) this.q_ = undefined;
      }
    },

    withStore_: function(mode, fn) {
      if ( GLOBAL.__TXN__ && GLOBAL.__TXN__.store ) {
        try {
          fn.call(this, __TXN__.store);
          return;
        } catch (x) {
          GLOBAL.__TXN__ = undefined;
        }
      }
      this.withDB((function (db) {
        var tx = db.transaction([this.name], mode);
        var os = tx.objectStore(this.name);
        if ( GLOBAL.__TXN__ ) GLOBAL.__TXN__.store = os;
        fn.call(this, os);
      }).bind(this));
    },

    put: function(value, sink) {
      var self = this;
      this.withStore("readwrite", function(store) {
        var request = store.put(self.serialize(value),
                                value[self.model.ids[0]]);

        request.transaction.addEventListener(
          'complete',
          function(e) {
            self.notify_('put', [value]);
            sink && sink.put && sink.put(value);
          });
        request.transaction.addEventListener(
          'error',
          function(e) {
            // TODO: Parse a better error mesage out of e
            sink && sink.error && sink.error('put', value);
          });
      });
    },

    find: function(key, sink) {
      if ( Expr.isInstance(key) ) {
        var found = false;
        this.limit(1).where(key).select({
          put: function() {
            found = true;
            sink.put.apply(sink, arguments);
          },
          eof: function() {
            found || sink.error('find', key);
          }
        });
        return;
      }

      var self = this;
      this.withStore("readonly", function(store) {
        var request = store.get(key);
        request.transaction.addEventListener(
          'complete',
          function() {
            if (!request.result) {
              sink && sink.error && sink.error('find', key);
              return;
            }
            var result = self.deserialize(request.result);
            sink && sink.put && sink.put(result);
          });
        request.onerror = function(e) {
          // TODO: Parse a better error out of e
          sink && sink.error && sink.error('find', key);
        };
      });
    },

    remove: function(obj, sink) {
      var self = this;
      var key = obj[this.model.ids[0]] != undefined ? obj[this.model.ids[0]] : obj;

      this.withStore("readwrite", function(store) {
        var getRequest = store.get(key);
        getRequest.onsuccess = function(e) {
          if (!getRequest.result) {
            sink && sink.error && sink.error('remove', obj);
            return;
          }
          var data = self.deserialize(getRequest.result);
          var delRequest = store.delete(key);
          delRequest.transaction.addEventListener('complete', function(e) {
            self.notify_('remove', [data]);
            sink && sink.remove && sink.remove(data);
          });

          delRequest.onerror = function(e) {
            sink && sink.error && sink.error('remove', e);
          };
        };
        getRequest.onerror = function(e) {
          sink && sink.error && sink.error('remove', e);
        };
        return;
      });
    },

    removeAll: function(sink, options) {
      var query = (options && options.query && options.query.partialEval()) ||
        { f: function() { return true; } };

      var future = afuture();
      var self = this;
      this.withStore('readwrite', function(store) {
        var request = store.openCursor();
        request.onsuccess = function(e) {
          var cursor = e.target.result;
          if (cursor) {
            var value = self.deserialize(cursor.value);
            if (query.f(value)) {
              var deleteReq = cursor.delete();
              deleteReq.transaction.addEventListener(
                'complete',
                function() {
                  self.notify_('remove', [value]);
                  sink && sink.remove && sink.remove(value);
                });
              deleteReq.onerror = function(e) {
                sink && sink.error && sink.error('remove', e);
              };
            }
            cursor.continue();
          }
        };
        request.transaction.oncomplete = function() {
          sink && sink.eof && sink.eof();
          future.set();
        };
        request.onerror = function(e) {
          sink && sink.error && sink.error('remove', e);
        };
      });
      return future.get;
    },

    select: function(sink, options) {
      sink = sink || [].sink;
      sink = this.decorateSink_(sink, options, false);

      var fc = this.createFlowControl_();
      var future = afuture();
      var self = this;

      this.withStore("readonly", function(store) {
        if ( options && options.query && EqExpr.isInstance(options.query) && store.indexNames.contains(options.query.arg1.name) ) {
          var request = store.index(options.query.arg1.name).openCursor(IDBKeyRange.only(options.query.arg2.f()));
        } else {
          var request = store.openCursor();
        }
        request.onsuccess = function(e) {
          var cursor = e.target.result;
          if ( fc.stopped ) return;
          if ( fc.errorEvt ) {
            sink.error && sink.error(fc.errorEvt);
            future.set(sink, fc.errorEvt);
            return;
          }

          if (!cursor) {
            sink.eof && sink.eof();
            future.set(sink);
            return;
          }

          var value = self.deserialize(cursor.value);
          sink.put(value);
          cursor.continue();
        };
        request.onerror = function(e) {
          sink.error && sink.error(e);
        };
      });

      return future.get;
    },

    addIndex: function(prop) {
      this.indicies.push([prop.name, false]);
      return this;
    }
  },

  listeners: [
    {
      name: 'updated',
      code: function(evt) {
        console.log('updated: ', evt);
        this.publish('updated');
      }
    }
  ]

});


CLASS({
  name: 'JSONFileDAO',
  extendsModel: 'AbstractFileDAO',

  label: 'JSON File DAO',

  properties: [
    {
      name:  'writeQueue',
      type:  'Array[String]',
      defaultValueFn: function() {
        return [];
      }
    }
  ],

  methods: {
    init: function() {
      this.SUPER();

      this.withWriter((function(writer) {
        writer.addEventListener(
          'writeend',
          (function(e) {
            this.writeOne_(e.target);
          }).bind(this));
      }).bind(this));
    },

    readFile_: function(reader, file) {
      reader.readAsText(file);
    },

    parseContents_: function(ret, contents, storage) {
      with (storage) { eval(contents); }
      ret(storage);
    },

    writeOne_: function(writer) {
      if ( writer.readyState == 1 ) return;
      if ( this.writeQueue.length == 0 ) return;

      writer.seek(writer.length);
      var queue = this.writeQueue;
      var blob = queue.shift();
      this.writeQueue = queue;
      writer.write(blob);
    },

    update_: function(mutation, obj) {
      var parts = [];

      if (mutation === 'put') {
        parts.push("put(" + JSONUtil.compact.stringify(obj) + ");\n");
      } else if (mutation === 'remove') {
        parts.push("remove(" + JSONUtil.compact.stringify(obj.id) + ");\n");
      }

      this.writeQueue = this.writeQueue.concat(new Blob(parts));

      this.withWriter((function(writer) {
        this.writeOne_(writer);
      }).bind(this));
    }
  }
});


CLASS({
  name: 'LRUCachingDAO',

  extendsModel: 'ProxyDAO',

  properties: [
    {
      model_: 'IntProperty',
      name: 'maxSize',
      defaultValue: 100
    },
    {
      name: 'cacheFactory',
      defaultValueFn: function() { return MDAO; }
    },
    {
      name: 'cache',
      hidden: true
    },
  ],

  models: [
    {
      model_: 'Model',
      name: 'LRUCacheItem',
      ids: ['id'],
      properties: [
        {
          name: 'id',
        },
        {
          name: 'obj',
        },
        {
          model_: 'DateTimeProperty',
          name: 'timestamp'
        }
      ]
    }
  ],

  methods: {
    init: function(args) {
      this.SUPER();
      this.cache = this.cacheFactory.create({
        model: this.LRUCacheItem
      });
      var self = this;
      this.delegate.listen({
        remove: function(obj) {
          self.cache.remove(obj);
        }
      });
    },
    find: function(id, sink) {
      var self = this;
      this.cache.find(id, {
        put: function(obj) {
          obj.timestamp = new Date();
          self.cache.put(obj, {
            put: function() {
              sink && sink.put && sink.put(obj.obj);
            }
          });
        },
        error: function() {
          self.delegate.find(id, {
            put: function(obj) {
              self.cache.put(self.LRUCacheItem.create({
                id: id,
                timestamp: new Date(),
                obj: obj
              }), {
                put: function(obj) {
                  sink && sink.put && sink.put(obj.obj);
                  self.cleanup_();
                },
                error: function() {
                  sink && sink.error && sink.error.apply(sink, arguments);
                }
              });
            },
            error: function() {
              sink && sink.error && sink.error.apply(sink, arguments);
            }
          });
        }
      });
    },
    put: function(obj, sink) {
      var self = this;
      this.cache.find(obj.id, {
        put: function(obj) {
          obj.timestamp = new Date();
          self.cache.put(obj, {
            put: function(obj) {
              self.delegate.put(obj.obj, sink);
            },
            error: function() {
              sink && sink.error && sink.error.apply(this, arguments);
            }
          });
        },
        error: function() {
          self.cache.put(self.LRUCacheItem.create({
            timestamp: new Date(),
            id: obj.id,
            obj: obj
          }), {
            put: function() {
              self.delegate.put(obj, sink);
              self.cleanup_();
            },
            error: function() {
              sink && sink.error && sink.error.apply(this, arguments);
            }
          });
        }
      });
    },
    remove: function(obj, sink) {
      if ( obj.id ) var id = obj.id;
      else id = obj;

      var self = this;
      this.cache.remove(obj.id, {
        put: function() {
          self.delegate.remove(obj, sink);
        },
        error: function() {
          sink && sink.error && sink.error('remove', obj);
        }
      });
    },
    removeAll: function(sink, options) {
      var self = this;
      this.delegate.removeAll({
        remove: function(obj) {
          self.cache.remove(obj.id, {
            remove: function() {
              sink && sink.remove && sink.remove(obj);
            },
            error: function() {
              // TODO: what's the right course of action here?
            }
          });
        },
        error: function() {
          sink && sink.error && sink.error.apply(sink, arguments);
        }
      }, options);
    },
    cleanup_: function() {
      // TODO: Use removeAll instead of select when
      // all DAOs respect skip in removeAll.
      var self = this;
      this.cache
        .orderBy(DESC(this.LRUCacheItem.TIMESTAMP))
        .skip(this.maxSize).select({
          put: function(obj) {
            self.cache.remove(obj);
          }
        });
    }
  }
});


CLASS({
  name: 'LazyCacheDAO',

  extendsModel: 'ProxyDAO',

  properties: [
    {
      name: 'cache',
      postSet: function(_, d) {
        d.listen(this.relay());
      }
    },
    {
      model_: 'BooleanProperty',
      name: 'refreshOnCacheHit',
      defaultValue: false,
      documentation: 'When true, makes a network call in the background to ' +
          'update the record, even on a cache hit.'
    },
    {
      model_: 'BooleanProperty',
      name: 'cacheOnSelect',
      documentation: 'Whether to populate the cache on select().',
      defaultValue: false
    },
    {
      model_: 'IntProperty',
      name: 'staleTimeout',
      defaultValue: 500,
      units: 'ms',
      documentation: 'Time in milliseconds before we consider the delegate ' +
          'results to be stale for a particular query and will issue a new ' +
          'select.'
    },
    {
      name: 'selects',
      factory: function() { return {}; }
    },
    {
      name: 'selectKey',
      defaultValue: function(sink, options) {
        var query = ( options && options.query && options.query.toSQL() ) || "";
        var limit = ( options && options.limit );
        var skip =  ( options && options.skip );
        var order = ( options && options.order && options.order.toSQL() ) || "";
        return [query, limit, skip, order];
      }
    }
  ],

  methods: {
    find: function(id, sink) {
      var self = this;

      var mysink = {
        put: this.refreshOnCacheHit ?
            function() {
              self.cache.put.apply(self.cache, arguments);
              sink.put.apply(sink, arguments);
            } :
            sink.put.bind(sink),
        error: function() {
          self.delegate.find(id, {
            put: function(obj) {
              var args = arguments;
              self.cache.put(obj, {
                put: function() { sink.put.apply(sink, args); }
              });
            },
            error: function() {
              sink && sink.error && sink.error.apply(sink, arguments);
            }
          });
        }
      };

      this.cache.find(id, mysink);
    },
    select: function(sink, options) {
      if ( ! this.cacheOnSelect ) {
        return this.SUPER(sink, options);
      }

      sink = sink || [].sink;

      var key = this.selectKey(sink, options);
      var future = afuture();
      var delegateFuture = afuture();
      var self = this;

      var entry = this.selects[key];

      if ( ! entry ||
           Date.now() - this.selects[key][1] > this.staleTimeout ) {
        this.selects[key] = entry = [afuture(), Date.now()];
        this.delegate.select(this.cache, options)(entry[0].set);
      } else {
        delegateFuture.set();
      }

      function readFromCache() {
        self.cache.select(sink, options)(future.set);
      }

      self.cache.select(COUNT(), options)(function(c) {
        if ( c.count > 0 ) {
          readFromCache();
        } else {
          entry[0].get(readFromCache);
        }
      });

      return future.get;
    }
  }
});


CLASS({
  name: 'LimitedLiveCachingDAO',

  extendsModel: 'ProxyDAO',

  properties: [
    {
      name: 'src'
    },
    { model_: 'IntProperty', name: 'cacheLimit', defaultValue: 100 },
    {
      name: 'cache',
      help: 'Alias for delegate.',
      getter: function() { return this.delegate },
      setter: function(dao) { this.delegate = dao; }
    },
    {
      name: 'model',
      defaultValueFn: function() { return this.src.model || this.cache.model; }
    }
  ],

  methods: {
    init: function() {
      this.SUPER();

      var src   = this.src;
      var cache = this.cache;

      src.limit(this.cacheLimit).select(cache)(function() {
        // Actually means that cache listens to changes in the src.
        src.listen(cache);
      }.bind(this));
    },
    put: function(obj, sink) { this.src.put(obj, sink); },
    remove: function(query, sink) { this.src.remove(query, sink); },
    removeAll: function(sink, options) { return this.src.removeAll(sink, options); }
  }
});


CLASS({
  name: 'ManuallyDelayedDAO',
  extendsModel: 'ProxyDAO',
  properties: [
    {
      name: 'pending',
      factory: function() { return []; }
    }
  ],
  methods: {
    select: function(sink, options) {
      var future = afuture();

      sink = sink || [].sink;

      var daofuture = this.delegate.select(undefined, options);

      var fc = this.createFlowControl_();

      this.pending.push(function(ret) {
        daofuture(function(a) {
          for ( var i = 0; i < a.length && ! fc.stopped; i++ ) {
            sink.put(a[i], null, fc);
            if ( fc.errorEvt ) {
              sink.error && sink.error(fc.errorEvt);
            }
          }
          if ( ! fc.errorEvt ) {
            sink.eof && sink.eof();
          }
          future.set(sink);
          ret();
        });
      });

      return future.get;
    },
    join: function(ret) {
      var pending = this.pending;
      this.pending = [];
      apar.apply(null, pending)(ret);
    }
  }
});

CLASS({
  name: 'DAOVersion',
  ids: ['name'],
  properties: [
    'name',
    'version'
  ]
});

CLASS({
  name: 'MigrationRule',
  ids: ['modelName'],
  properties: [
    {
      model_: 'StringProperty',
      name: 'modelName',
    },
    {
      model_: 'IntProperty',
      name: 'version'
    },
    {
      model_: 'FunctionProperty',
      name: 'migration'
    }
  ]
});


CLASS({
  name: 'MigrationDAO',
  extendsModel: 'ProxyDAO',

  properties: [
    {
      name: 'delegate'
    },
    {
      model_: 'ArrayProperty',
      subType: 'MigrationRule',
      name: 'rules'
    },
    {
      name: 'name'
    }
  ],

  methods: {
    init: function() {
      var dao = this.delegate;
      var future = afuture()
      this.delegate = FutureDAO.create({future: future.get});

      var self = this;
      var version;
      aseq(
        function(ret) {
          self.X.DAOVersionDAO.find(self.name, {
            put: function(c) {
              version = c;
              ret();
            },
            error: function() {
              version = DAOVersion.create({
                name: self.name,
                version: 0
              });
              ret();
            }
          });
        },
        function(ret) {
          function updateVersion(ret, v) {
            var c = version.clone();
            c.version = v;
            self.X.DAOVersionDAO.put(c, ret);
          }

          var rulesDAO = self.rules.dao;

          rulesDAO
            .where(AND(GT(MigrationRule.VERSION, version.version),
                       LTE(MigrationRule.VERSION, self.X.App.version)))
            .select()(function(rules) {
              var seq = [];
              for ( var i = 0; i < rules.length; i++ ) {
                     (function(rule) {
                       seq.push(
                         aseq(
                           function(ret) {
                             rule.migration(ret, dao);
                           },
                           function(ret) {
                             updateVersion(ret, rule.version);
                           }));
                     })(self.rules[i]);
              }
              if ( seq.length > 0 ) aseq.apply(null, seq)(ret);
              else ret();
            });
        })(function() {
          future.set(dao);
        });
      this.SUPER();
    }
  }
});


CLASS({
  name: 'ParitionDAO',
  extendsModel: 'AbstractDAO',

  properties: [
    {
      name: 'partitions',
      type: 'Array[DAO]',
      mode: "read-only",
      required: true
    }
  ],

  methods: {
    init: function() {
      this.SUPER();

      for ( var i = 0; i < this.partitions.length; i++) {
        var part = this.partitions[i];
        var self = this;
        part.listen({
          put: function(value) {
            self.notify_("put", [value]);
          },
          remove: function(value) {
            self.notify_("remove", [value]);
          }
        });
      }
    },
    getPartition_: function(value) {
      return this.partitions[Math.abs(value.hashCode()) % this.partitions.length];
    },
    put: function(value, sink) {
      this.getPartition_(value).put(value, sink);
    },
    remove: function(obj, sink) {
      if (obj.id) {
        this.getPartition_(obj).remove(obj, sink);
      } else {
        var self = this;
        this.find(obj, { put: function(obj) { self.remove(obj, sink); }, error: sink && sink.error });
      }
    },
    find: function(key, sink) {
      // Assumes no data redundancy
      for (var i = 0; i < this.partitions.length; i++) {
        this.partitions[i].find(key, sink);
      }
    },
    select: function(sink, options) {
      sink = sink || [].sink;
      var myoptions = {};
      var originalsink = sink;
      options = options || {};
      if ( 'limit' in options ) {
        myoptions.limit = options.limit + (options.skip || 0),
        myoptions.skip = 0;
      }

      myoptions.order = options.order;
      myoptions.query = options.query;

      var pending = this.partitions.length;

      var fc = this.createFlowControl_();
      var future = afuture();

      if ( sink.model_ && sink.reduceI ) {
        var mysink = sink;
      } else {
        if ( options.order ) {
          mysink = OrderedCollectorSink.create({ comparator: options.order });
        } else {
          mysink = CollectorSink.create({});
        }
        if ( 'limit' in options ) sink = limitedSink(options.limit, sink);
        if ( options.skip ) sink = skipSink(options.skip, sink);

        mysink.eof = function() {
          for (var i = 0; i < this.storage.length; i++) {
            if ( fc.stopped ) break;
            if ( fc.errorEvt ) {
              sink.error && sink.error(fc.errorEvt);
              future.set(sink, fc.errorEvt);
              break;
            }
            sink.put(this.storage[i], null, fc);
          }
        };
      }

      var sinks = new Array(this.partitions.length);
      for ( var i = 0; i < this.partitions.length; i++ ) {
        sinks[i] = mysink.deepClone();
        sinks[i].eof = function() {
          mysink.reduceI(this);
          pending--;
          if (pending <= 0) {
            mysink.eof && mysink.eof();
            future.set(originalsink);
          }
        };
      }

      for ( var i = 0; i < this.partitions.length; i++ ) {
        this.partitions[i].select(sinks[i], myoptions);
      }

      return future.get;
    }
  }
});



CLASS({
  name: 'PropertyOffloadDAO',
  extendsModel: 'ProxyDAO',

  properties: [
    {
      name: 'property'
    },
    {
      name: 'offloadDAO'
    },
    {
      model_: 'BooleanProperty',
      name: 'loadOnSelect'
    }
  ],

  methods: {
    put: function(obj, sink) {
      if ( obj.hasOwnProperty(this.property.name) ) {
        var offload = this.model.create({ id: obj.id });
        offload[this.property.name] = this.property.f(obj);
        obj[this.property.name] = '';
        this.offloadDAO.put(offload);
      }
      this.delegate.put(obj, sink);
    },

    select: function(sink, options) {
      if ( ! this.loadOnSelect ) return this.delegate.select(sink, options);

      var mysink = this.offloadSink(sink);
      return this.delegate.select(mysink, options);
    },

    offloadSink: function(sink) {
      var self = this;
      return {
        __proto__: sink,
        put: function(obj) {
          sink.put && sink.put.apply(sink, arguments);
          self.offloadDAO.find(obj.id, {
            put: function(offload) {
              if ( offload[self.property.name] )
                obj[self.property.name] = offload[self.property.name];
            }
          });
        },
      };
    },

    find: function(id, sink) {
      this.delegate.find(id, this.offloadSink(sink));
    }
  }
});


CLASS({
  name: 'RestDAO',
  extendsModel: 'AbstractDAO',

  imports: [
    'ajsonp'
  ],

  properties: [
    {
      name: 'model',
      label: 'Type of data stored in this DAO.'
    },
    {
      name: 'url',
      label: 'REST API URL.'
    },
    {
      model_: 'ArrayProperty',
      subType: 'Property',
      name: 'paramProperties',
      help: 'Properties that are handled as separate parameters rather than in the query.'
    },
    {
      model_: 'IntProperty',
      name: 'batchSize',
      defaultValue: 200
    },
    {
      model_: 'IntProperty',
      name: 'skipThreshold',
      defaultValue: 1000
    }
  ],

  methods: {
    jsonToObj: function(json) {
      return this.model.create(json);
    },
    objToJson: function(obj) {
      return JSONUtil.compact.stringify(obj);
    },
    buildURL: function(query) {
      return this.url;
    },
    buildFindURL: function(key) {
      return this.url + '/' + key;
    },
    buildPutURL: function(obj) {
      return this.url;
    },
    buildPutParams: function(obj) {
      return [];
    },
    buildSelectParams: function(sink, query) {
      return [];
    },
    put: function(value, sink) {
      var self = this;
      var extra = {};
      this.ajsonp(this.buildPutURL(value),
             this.buildPutParams(value),
             "POST",
             this.objToJson(value, extra)
            )(
        function(resp, status) {
          if ( status !== 200 ) {
            sink && sink.error && sink.error([resp, status]);
            return;
          }
          var obj = self.jsonToObj(resp, extra);
          sink && sink.put && sink.put(obj);
          self.notify_('put', [obj]);
        });
    },
    remove: function(query, sink) {
    },
    select: function(sink, options) {
      sink = sink || [].sink;
      var fut = afuture();
      var self = this;
      var limit;
      var skipped = 0;
      var index = 0;
      var fc = this.createFlowControl_();
      // TODO: This is a very ugly way of passing additional data
      // from buildURL to jsonToObj, used by the IssueCommentNetworkDAO
      // Clean this up.
      var extra = {};
      var params = [];

      if ( options ) {
        index += options.skip || 0;

        var query = options.query;
        var url;

        if ( query ) {
          var origQuery = query;
          query = query.normalize();

          var outquery = [query, origQuery.deepClone()];

          params = this.buildSelectParams(sink, outquery);

          url = this.buildURL(outquery, extra);

          query = outquery[0];
          origQuery = outquery[1];

          var mql = query.toMQL();
          if ( mql ) params.push('q=' + encodeURIComponent(query.toMQL()));
        } else {
          url = this.buildURL();
        }

        if ( options.order ) {
          var sort = options.order.toMQL();
          params.push("sort=" + sort);
        }

        if ( options.limit ) {
          limit = options.limit;
        }
      }

      var finished = false;
      awhile(
        function() { return !finished; },
        function(ret) {
          var batch = self.batchSize;

          if ( Number.isFinite(limit) )
            var batch = Math.min(batch, limit);

          // No need to fetch items for count.
          if ( CountExpr.isInstance(sink) ) {
            batch = 0;
          }

          var myparams = params.slice();
          myparams.push('maxResults=' + batch);
          myparams.push('startIndex=' + index);

          self.ajsonp(url, myparams)(function(data) {
            // Short-circuit count.
            // TODO: This count is wrong for queries that use
            if ( CountExpr.isInstance(sink) ) {
              sink.count = data.totalResults;
              finished = true;
              ret(); return;
            }

            var items = data && data.items ? data.items : [];

            // Fetching no items indicates EOF.
            if ( items.length == 0 ) finished = true;
            index += items.length;

            for ( var i = 0 ; i < items.length; i++ ) {
              var item = self.jsonToObj(items[i], extra)

              // Filter items that don't match due to
              // low resolution of Date parameters in MQL
              if ( origQuery && !origQuery.f(item) ) {
                skipped++;
                continue;
              }

              if ( Number.isFinite(limit) ) {
                if ( limit <= 0 ) { finished = true; break; }
                limit--;
              }

              if ( fc.stopped ) { finished = true; break; }
              if ( fc.errorEvt ) {
                sink.error && sink.error(fc.errorEvt);
                finished = true;
                break;
              }

              sink && sink.put && sink.put(item, null, fc);
            }
            if ( limit <= 0 ) finished = true;
            if ( ! data || index >= data.totalResults ) finished = true;
            if ( skipped >= self.skipThreshold ) finished = true;
            ret();
          });
        })(function() { sink && sink.eof && sink.eof(); fut.set(sink); });

      return fut.get;
    },
    buildFindParams: function(key) {
      return [];
    },
    find: function(key, sink) {
      var self = this;
      this.ajsonp(this.buildFindURL(key), this.buildFindParams())(function(data, status) {
        var deserialized;
        if ( status !== 200 || ! (deserialized = self.jsonToObj(data)) ) {
          sink && sink.error && sink.error('Network error');
          return;
        }

        sink && sink.put && sink.put(deserialized);
      });
    }
  }
});


CLASS({
  name: 'SlidingWindowDAODecorator',
  extendsModel: 'ProxyDAO',
  help: 'A DAO decorator which reduces network calls by caching a chunk of data around a given query for a period of time.',
  properties: [
    {
      name: 'queryCache',
      factory: function() { return {}; }
    },
    {
      name: 'queryTTL',
      help: 'Time to keep each query alive in ms',
      defaultValue: 10000
    },
    {
      name: 'windowSize',
      defaultValue: 20
    }
  ],
  methods: {
    select: function(sink, options) {
      if ( ! this.timeout_ ) this.timeout_ = this.X.setTimeout(this.purge, this.queryTTL);

      sink = sink || [].sink;

      var query = options && options.query;
      var order = options && options.order;
      var skip = options.skip;
      var limit = options.limit;

      var key = [
        'query=' + (query ? query.toSQL() : ''),
        'order=' + (order ? order.toSQL() : '')
      ];


      if ( Expr.isInstance(sink) ) {
        var shortcircuit = true;
        var mysink = sink.deepClone();
        key.push(sink.model_.name);
      } else {
        mysink = [].sink;
      }

      var cached = this.queryCache[key];

      // If the cached version
      if ( ! cached ||
           ! ( skip == undefined || cached[1] <= skip ) ||
           ! ( limit == undefined || cached[2] >= skip + limit ) ) {
        delete this.queryCache[key];
        skip = skip || 0;
        cached = [
          afuture(),
          Math.max(0, skip - this.windowSize / 2),
          limit == undefined ? undefined : (skip + limit + this.windowSize / 2),
          Date.now()
        ];
        this.queryCache[key] = cached;

        this.delegate.select(mysink, {
          query: query,
          order: order,
          skip: cached[1],
          limit: ( limit === undefined ) ? undefined : ( cached[2] - cached[1] )
        })(function() {
          cached[0].set(mysink);
        });
      }

      var future = afuture();

      if ( shortcircuit ) {
        cached[0].get(function(mysink) {
          sink.copyFrom(mysink);
          future.set(sink);
        });
      } else {
        cached[0].get(function(mysink) {
          mysink.select(sink, {
            skip: ( skip == undefined ) ? undefined : ( skip - cached[1] ),
            limit: ( limit == undefined ) ? undefined : limit
          })(function() {
            future.set(sink);
          });
        });
      }
      return future.get;
    }
  },
  listeners: [
    {
      name: 'purge',
      code: function() {
        this.timeout_ = undefined
        var keys = Object.keys(this.queryCache);
        var threshold = Date.now()  - this.queryTTL;
        for ( var i = 0, key; key = keys[i]; i++ )
          if ( this.queryCache[key][3] < threshold ) delete this.queryCache[key];
      }
    }
  ]
});


CLASS({
  name: 'StorageDAO',

  extendsModel: 'MDAO',

  properties: [
    {
      name:  'name',
      label: 'Store Name',
      type:  'String',
      defaultValueFn: function() {
        return this.model.plural;
      }
    }
  ],

  methods: {
    init: function() {
      this.SUPER();

      var objs = localStorage.getItem(this.name);
      if ( objs ) JSONUtil.parse(this.X, objs).select(this);

      this.addRawIndex({
        execute: function() {},
        bulkLoad: function() {},
        toString: function() { return "StorageDAO Update"; },
        plan: function() {
          return { cost: Number.MAX_VALUE };
        },
        put: this.updated,
        remove: this.updated
      });
    }
  },

  listeners: [
    {
      name: 'updated',
      isMerged: 100,
      code: function() {
        this.select()(function(a) {
          localStorage.setItem(this.name, JSONUtil.compact.where(NOT_TRANSIENT).stringify(a));
        }.bind(this));
      }
    }
  ]
});

CLASS({
  name: 'StoreAndForwardOperation',
  properties: [
    { model_: 'IntProperty', name: 'id' },
    { model_: 'StringProperty', name: 'method', view: { factory_: 'ChoiceView', choices: ['put', 'remove'] } },
    { name: 'obj' },
  ]
});


CLASS({
  name: 'StoreAndForwardDAO',
  extendsModel: 'ProxyDAO',

  properties: [
    { name: 'storageName' },
    { name: 'store', required: true, type: 'DAO',
      factory: function() {
        return SeqNoDAO.create({
          delegate: IDBDAO.create({
            model: StoreAndForwardOperation,
            name: this.storageName || ( this.delegate.model ? this.delegate.model.plural - 'operations' : '' ),
            useSimpleSerialization: false
          }),
        });
      }
    },
    { model_: 'IntProperty', name: 'retryInterval', units: 'ms', defaultValue: 5000 },
    { model_: 'BooleanProperty', name: 'syncing', defaultValue: false }
  ],

  models: [
  ],

  methods: {
    store_: function(method, obj, sink) {
      var self = this;
      var op = StoreAndForwardOperation.create({
        method: method,
        obj: obj.clone()
      });
      self.store.put(op, {
        put: function(o) {
          sink && sink[method] && sink[method](obj);
          self.pump_();
        },
        error: function() {
          sink && sink.error && sink.error(method, obj);
        }
      });
    },
    put: function(obj, sink) {
      this.store_('put', obj, sink);
    },
    remove: function(obj, sink) {
      this.store_('remove', obj, sink);
    },
    pump_: function() {
      if ( this.syncing ) return;
      this.syncing = true;

      var self = this;
      awhile(
        function() { return self.syncing; },
        aseq(
          function(ret) {
            self.forward_(ret);
          },
          function(ret) {
            self.store.select(COUNT())(function(c) {
              if ( c.count === 0 ) self.syncing = false;
              ret();
            });
          },
          function(ret) {
            self.X.setTimeout(ret, self.retryInterval);
          }
        ))(function(){});
    },
    forward_: function(ret) {
      var self = this;
      this.store.orderBy(StoreAndForwardOperation.ID).select()(function(ops) {
        var funcs = [];
        for ( var i = 0; i < ops.length; i++ ) {
          (function(op) {
            funcs.push(function(ret) {
              self.delegate[op.method](op.obj, {
                put: function(obj) {
                  // If the objects id was updated on put, remove the old one and put the new one.
                  if ( obj.id !== op.obj.id ) {
                    self.notify_('remove', [op.obj]);
                    self.notify_('put', [obj]);
                  }
                  ret(op);
                },
                remove: function() {
                  ret(op);
                },
                error: function() {
                  ret();
                }
              });
            });
          })(ops[i]);
        }

        aseq(
          apar.apply(null, funcs),
          function(ret) {
            var funcs = [];
            for ( var i = 1; i < arguments.length; i++ ) {
              (function(op) {
                funcs.push(function(ret) {
                  self.store.remove(op, ret);
                });
              })(arguments[i]);
            }
            apar.apply(null, funcs)(ret);
          })(ret);
      });
    }
  }
});


CLASS({
  name: 'WorkerDAO',
  extendsModel: 'AbstractDAO',

  properties: [
    {
      name: 'model',
      type: 'Model',
      required: true
    },
    {
      name: 'delegate',
      type: 'Worker',
      help: 'The web-worker to delegate all actions to.',
      factory: function() {
        var url = window.location.protocol +
          window.location.host +
          window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/") + 1);
        var workerscript = [
          "var url = '" + url + "';\n",
          "var a = importScripts;",
          "importScripts = function(scripts) { \nfor (var i = 0; i < arguments.length; i++) \na(url + arguments[i]); \n};\n",
          "try { importScripts('bootFOAMWorker.js'); } catch(e) { \n console.error(e); }\n",
          "WorkerDelegate.create({ dao: [] });\n"
        ];
        return new Worker(window.URL.createObjectURL(
          new Blob(workerscript, { type: "text/javascript" })));
      },
      postSet: function(oldVal, val) {
        if ( oldVal ) {
          oldVal.terminate();
        }
        val.addEventListener("message", this.onMessage);
      }
    },
    {
      name:  'requests_',
      type:  'Object',
      label: 'Requests',
      help:  'Map of pending requests to delegate.',
      factory: function() { return {}; }
    },
    {
      name:  'nextRequest_',
      type:  'Int',
      label: 'Next Request',
      help:  'Id of the next request to the delegate.',
      factory: function() { return 1; }
    },
    { // Consider making this a DAO.  Challenge is keeping in sync if this throws errors after delegate has completed something.
      name:  'storage_',
      type:  'Object',
      label: 'Storage',
      help:  'Local cache of the data in the delegate.',
      factory: function() { return {}; }
    }
  ],

  methods: {
    init: function() {
      this.SUPER();
      this.delegate.postMessage("");
    },
    destroy: function() {
      // Send a message to the delegate?
      this.delegate.terminate();
    },
    makeRequest_: function(method, params, callback, error) {
      var reqid = this.nextRequest_++;
      params = params ?
        ObjectToJSON.visit(params) :
        {};
      var message = {
        method: method,
        params: params,
        request: reqid
      };
      this.requests_[reqid] = {
        method: method,
        callback: callback,
        error: error
      };
      this.delegate.postMessage(message);
    },
    put: function(obj, sink) {
      this.makeRequest_(
        "put", obj,
        (function(response) {
          this.storage_[obj.id] = obj;
          this.notify_("put", [obj]);
          sink && sink.put && sink.put(obj);
        }).bind(this),
        sink && sink.error && sink.error.bind(sink));
    },
    remove: function(query, sink) {
      this.makeRequest_(
        "remove", query,
        (function(response) {
          for ( var i = 0, key = response.keys[i]; key; i++) {
            var obj = this.storage_[key];
            delete this.storage_[key];
            sink && sink.remove && sink.remove(obj);
          }
        }).bind(this),
        sink && sink.error && sink.error.bind(sink));
    },
    // TODO: Implement removeAll()
    find: function(id, sink) {
      // No need to go to worker.
      this.storage_.find(id, sink);
    },
    select: function(sink, options) {
      sink = sink || [].sink;
      // Cases:
      // 1) Cloneable reducable sink. -- Clone sync, get response, reduceI
      // 2) Non-cloneable reducable sink -- treat same as case 3.
      // 3) Non-cloneable non-reducable sink -- Use key-creator, just put into sink

      var fc = this.createFlowControl_();

      if (sink.model_ && sink.reduceI) {
        var request = {
          sink: sink,
          options: options
        };

        this.makeRequest_(
          "select", request,
          (function(response) {
            var responsesink = JSONToObject.visit(response.sink);
            sink.reduceI(responsesink);
            sink.eof && sink.eof();
          }).bind(this),
          sink && sink.error && sink.error.bind(sink));
      } else {
        var mysink = KeyCollector.create();
        request = {
          sink: mysink,
          options: options
        };

        this.makeRequest_(
          "select", request,
          (function(response) {
            var responsesink = JSONToObject.visit(response.sink);
            for (var i = 0; i < responsesink.keys.length; i++) {
              var key = responsesink.keys[i];
              if ( fc.stopped ) break;
              if ( fc.errorEvt ) {
                sink.error && sink.error(fc.errorEvt);
                break;
              }
              var obj = this.storage_[key];
              sink.put(obj);
            }
            sink.eof && sink.eof();
          }).bind(this),
          sink && sink.error && sink.error.bind(sink));
      }
    },
    handleNotification_: function(message) {
      if (message.method == "put") {
        var obj = JSONToObject.visitObject(message.obj);
        this.storage_[obj.id] = obj;
        this.notify_("put", [obj]);
      } else if (message.method == "remove") {
        var obj = this.stroage_[message.key];
        delete this.storage_[message.key];
        this.notify_("remove", [obj]);
      }
    }
  },

  listeners: [
    {
      name: 'onMessage',
      help: 'Callback for message events from the delegate.',
      code: function(e) {
        // FIXME: Validate origin.
        var message = e.data;
        if (message.request) {
          var request = this.requests_[message.request];
          delete this.requests_[message.request];
          if (message.error) {
            request.error(message.error);
            return;
          }
          request.callback(message);
          return;
        } // If no request was specified this is a notification.
        this.handleNotification_(message);
      }
    }
  ]
});
