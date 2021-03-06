/**
 * @license
 * Copyright 2014 Google Inc. All Rights Reserved
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

CLASS({
  name: 'DocView',
  package: 'foam.documentation',
  extendsModel: 'foam.views.DetailView',
  label: 'Documentation View Base',
  documentation: 'Base Model for documentation views.',

  imports: ['documentViewRef'],

  requires: ['foam.documentation.DocRefView as DocRefView'],

  documentation: function() {/*
    <p>Underlying the other documentation views, $$DOC{ref:'.'} provides the ability
    to specify $$DOC{ref:'foam.documentation.DocRef', text:"$$DOC{ref:'MyModel.myFeature'}"} tags in your
    documentation templates, creating child $$DOC{ref:foam.documentation.DocRefView'} views and $$DOC{ref:'foam.documentation.DocRef'}
    references.</p>
    <p>In addition, the $$DOC{ref:'.', text:"$$THISDATA{}"} tag allows your template to
    pass on its data directly, rather than a property of that data.</p>
    <p>Views that wish to use DOC reference tags should extend this model. To display the
    $$DOC{ref:'Model.documentation'} of a model, use a $$DOC{ref:'DocModelView'} or
    $$DOC{ref:'foam.docmentation.DocBodyView'}.</p>
    <p>Documentation views require that a this.documentViewRef $$DOC{ref:'SimpleValue'}
    be present on the context. The supplied model is used as the base for resolving documentation
    references. If you are viewing the documentation for a Model, it will be a
    reference to that Model.</p>
    <p>See $$DOC{ref:'DocumentationBook'} for information on creating documentaion
    that is not directly associated with a $$DOC{ref:'Model'}.</p>
  */},

  properties: [
    {
      name: 'className',
      defaultValue: '',
    }
  ],

  methods: {
    init: function() { /* <p>Warns if this.documentViewRef is missing.</p>
      */
      this.SUPER();
      if (!this.documentViewRef) {
        console.warn("*** Warning: DocView ",this," can't find documentViewRef in its context "+this.X.NAME);
      }
    },

    toHTML: function() {
      // from View.toHTML():
      this.invokeDestructors();
      return '<' + this.tagName + ' id="' + this.id + '"' + this.cssClassAttr() + '>' +
        this.toInnerHTML() +
        '</' + this.tagName + '>';
    },

    createReferenceView: function(opt_args) { /*
      <p>Creates $$DOC{ref:'foam.documentation.DocRefView'} reference views from $$DOC{ref:'.',text:'$$DOC'}
          tags in documentation templates.</p>
      */
      var X = ( opt_args && opt_args.X ) || this.X;
      var v = X.foam.documentation.DocRefView.create(opt_args, X);
      this.addChild(v);
      return v;
    },

    createTemplateView: function(name, opt_args) {
      /*
        Overridden to add support for the $$DOC{ref:'.',text:'$$DOC'} and
        $$DOC{ref:'.',text:'$$THISDATA'} tags.
      */
      // name has been constantized ('PROP_NAME'), but we're
      // only looking for certain doc tags anyway.
      if (name === 'DOC') {
        var v = this.createReferenceView(opt_args);
        return v;
      } else {
        //if (opt_args && !opt_args.X) opt_args.X = this.X;
        return this.SUPER(name, opt_args);
      }
    }
  },


});

CLASS({
  name: 'TextualDAOListView',
  package: 'foam.documentation',
  extendsModel: 'foam.views.DAOListView',
    
  methods: {    
    // Template method
    separatorToHTML: function(out) {
      out.push(", ");
    }
  }
});

CLASS({
  name: 'DocViewPicker',
  package: 'foam.documentation',
  extendsModel: 'foam.documentation.DocView',
  label: 'Documentation View Full Page',
  documentation: 'Base Model for full page documentation views.',

  requires: ['foam.documentation.FullPageDocView'],
 
  documentation: function() {/*
    Creates a sub-view appropriate for the specified data (such as a Model definition,
    DocumentationBook, or other thing.
  */},

  templates: [
    function toInnerHTML() {/*
      <% this.destroy();
      if (this.data && this.model) { %>
        $$data{model_: 'foam.documentation.FullPageDocView', model: this.model }
  <%  } %>
    */}
  ]


});



CLASS({
  name: 'FullPageDocView',
  package: 'foam.documentation',
  extendsModel: 'foam.documentation.DocView',
  label: 'Documentation View Full Page',
  documentation: 'Base Model for full page documentation views.',

  documentation: function() {/*
    For full-page views, typically including full lists of all features,
    subclass $$DOC{ref:'foam.documentation.FullPageDocView'}.</p>
    <p>Name your subclass with the name of the type you support:</p>
    <p><code>
    CLASS({ <br/>
    &nbsp;&nbsp;  name: 'PropertyFullPageDocView',<br/>
    &nbsp;&nbsp;  extendsModel: 'FullPageDocView'<br/>
    });<br/>
    // automatically creates PropertyFullPageDocView<br/>
    FullPageDocView.create({model:X.Property});<br/>
    </code></p>
  */}

});

CLASS({
  name: 'SummaryDocView',
  package: 'foam.documentation',
  extendsModel: 'foam.documentation.DocView',
  label: 'Documentation View Summary',
  documentation: 'Base Model for medium length summary documentation views.',

  documentation: function() {/*
    For inline summaries, typically including properties but not full
    feature lists, subclass $$DOC{ref:'foam.documentation.SummaryDocView'}.</p>
    <p>Name your subclass with the name of the type you support:</p>
    <p><code>
    CLASS({ <br/>
    &nbsp;&nbsp;  name: 'MethodSummaryDocView',<br/>
    &nbsp;&nbsp;  extendsModel: 'SummaryDocView'<br/>
    });<br/>
    // automatically creates MethodSummaryDocView<br/>
    SummaryDocView.create({model:X.Method});<br/>
    </code></p>
  */}

});

CLASS({
  name: 'RowDocView',
  package: 'foam.documentation',
  extendsModel: 'foam.documentation.DocView',
  label: 'Documentation View Row',
  documentation: 'Base Model for one or two line documentation row views.',

  documentation: function() {/*
    For one or two line row views, only including essential information,
    subclass $$DOC{ref:'foam.documentation.RowDocView'}.</p>
    <p>Name your subclass with the name of the type you support:</p>
    <p><code>
    CLASS({ <br/>
    &nbsp;&nbsp;  name: 'ListenerRowDocView',<br/>
    &nbsp;&nbsp;  extendsModel: 'RowDocView'<br/>
    });<br/>
    // automatically creates ListenerRowDocView<br/>
    RowDocView.create({model:X.Listener});<br/>
    </code></p>
  */},

  templates: [

    function toInnerHTML()    {/*
<%    this.destroy(); %>
<%    if (this.data) {  %>
        <p class="important"><%=this.data.name%></p>
        $$documentation{ model_: 'foam.documentation.DocBodyView' }
<%    } %>
    */}
  ]


});

CLASS({
  name: 'DocModelInheritanceTracker',
  package: 'foam.documentation',
  documentation: 'Stores inheritance information for a Model',
  documentation: function() { /*
      <p>Stores inheritance information for a $$DOC{ref:'Model'}. One
      instance per extending $$DOC{ref:'Model'} is stored in the
      this.featureDAO (starting with the data of
      $$DOC{ref:'DocModelView'}, and following the .extendsModel chain.
      </p>
      <p>See $$DOC{ref:'DocModelView'}.
      </p>
  */},

  ids: ['model'],

  properties: [
    {
      name: 'model',
      documentation: 'The model name.',
      documentation: "The $$DOC{ref:'Model'} name."
    },
    {
      name: 'inheritanceLevel',
      documentation: 'The inheritance level of model.',
      documentation: "The inheritance level of $$DOC{ref:'.model'} (0 = root, no extendsModel specified)",
      defaultValue: 0
    },
  ]
});

CLASS({
  name: 'DocFeatureInheritanceTracker',
  package: 'foam.documentation',
  documentation: 'Stores inheritance information for a feature of a Model',
  documentation: function() { /*
      <p>Stores inheritance information for a feature of a $$DOC{ref:'Model'}
          in the this.featureDAO.
      </p>
      <p>See $$DOC{ref:'DocModelView'}.
      </p>
  */},

  requires: ['foam.documentation.DocModelInheritanceTracker as DocModelInheritanceTracker'],

  imports: ['modelDAO'],

  ids: [ 'primaryKey' ],

  properties: [
    {
      name: 'name',
      documentation: "The feature name. This could be a $$DOC{ref:'Method'}, $$DOC{ref:'Property'}, or other feature. Feature names are assumed to be unique within the containing $$DOC{ref:'Model'}.",
      defaultValue: "",
      postSet: function() {
        this.primaryKey = this.model + ":::" + this.name;
      }
    },
    {
      name: 'isDeclared',
      documentation: "Indicates that the feature is declared in the containing $$DOC{ref:'Model'}.",
      defaultValue: false
    },
    {
      name: 'type',
      documentation: "The type ($$DOC{ref:'Model.name', text:'Model name'} string) of the feature, such as $$DOC{ref:'Property'} or $$DOC{ref:'Method'}."
    },
    {
      name: 'feature',
      documentation: "A reference to the actual feature.",
      postSet: function() {
        this.name = this.feature.name;
      }
    },
    {
      name: 'modelDAO'
    },
    {
      name: 'model',
      documentation: 'The name of the Model to which the feature belongs.',
      documentation: "The name of the $$DOC{ref:'Model'} to which the feature belongs.",
      postSet: function() {
        this.primaryKey = this.model + ":::" + this.name;
      }
    },
    {
      name: 'primaryKey',
      defaultValue: ''
    },
    {
      name: 'inheritanceLevel',
      documentation: "Helper to look up the inheritance level of $$DOC{ref:'.model'}",
      getter: function() {
        var modelTracker = [];
        this.modelDAO.where(EQ(this.DocModelInheritanceTracker.MODEL, this.model))
            .select(modelTracker);
        this.instance_.inheritanceLevel = modelTracker[0].inheritanceLevel;
        return this.instance_.inheritanceLevel;
      }
    },
    {
      name: 'fromTrait',
      documentation: 'Indicates if the feature was inherited from a trait.',
      model_: 'BooleanProperty',
      defaultValue: false
    }
  ],
  methods: {
    toString: function() {
      return this.model + ": " + this.name + ", " + this.isDeclared;
    }
  }
});

CLASS({
  name: 'DocModelFeatureDAOTrait',
  package: 'foam.documentation',
  documentation: "Generates a featureDAO of all the inherited features of a $$DOC{ref:'Model'}.",

  requires: ['foam.documentation.DocFeatureInheritanceTracker',
             'foam.documentation.DocModelInheritanceTracker',
             'Model',
             'MDAO'],

  imports: ['masterModelList'],
  exports: ['featureDAO', 'modelDAO', 'subModelDAO'],

  properties: [
    {
      name: 'featureDAO',
      model_: 'DAOProperty',
      factory: function() {
        return this.MDAO.create({model:this.DocFeatureInheritanceTracker, autoIndex:true});
      }
    },
    {
      name: 'modelDAO',
      model_: 'DAOProperty',
      factory: function() {
        return this.MDAO.create({model:this.DocModelInheritanceTracker, autoIndex:true});
      }
    },
    {
      name: 'subModelDAO',
      model_: 'DAOProperty',
      factory: function() {
        return this.MDAO.create({model:this.Model, autoIndex:true});
      }
    },
  ],
  
  methods: {
     
    generateFeatureDAO: function(data) {
      /* Builds a feature DAO to sort out inheritance and overriding of
        $$DOC{ref:'Property',usePlural:true}, $$DOC{ref:'Method',usePlural:true},
        and other features. */
       
      //var startTime = Date.now();
      //console.log("Generating FeatureDAO...", this.data );

      this.featureDAO.removeAll();
      this.modelDAO.removeAll();
      this.subModelDAO.removeAll();

      if ( ! data.model_ || data.model_.id !== 'Model' ) {
        console.warn("ModelDocView created with non-model instance: ", data);
        return;
      }
      
      if ( ! this.X.modelDAO ) {
        // we aren't done init yet, so wait and our init(); will call us again
        return;
      }
      
      // Run through the features in the Model definition in this.data,
      // and load them into the feature DAO. Passing [] assumes we don't
      // care about other models that extend this one. Finding such would
      // be a global search problem.
      this.loadFeaturesOfModel(data, []);
      this.findSubModels(data);
      
      //console.log("  FeatureDAO complete.", Date.now() - startTime);

      //this.debugLogFeatureDAO();
    },
    loadFeaturesOfModel: function(model, previousExtenderTrackers, traitInheritanceLevel) {
      /* <p>Recursively load features of this $$DOC{ref:'Model'} and
        $$DOC{ref:'Model',usePlural:true} it extends.</p>
        <p>Returns the inheritance level of model (0 = $$DOC{ref:'Model'}).
        </p>
        */
       
      var isTrait = true;
      if (typeof traitInheritanceLevel == 'undefined') {
        traitInheritanceLevel = 0;
        isTrait = false;
      } 
      var modelDef = model.definition_?  model.definition_: model;
      var self = this;
      var newModelTr = this.DocModelInheritanceTracker.create();
      newModelTr.model = model.id;

      this.Model.properties.forEach(function(modProp) {
        var modPropVal = modelDef[modProp.name];
        if ( Array.isArray(modPropVal) ) { // we only care to check inheritance on the array properties
          modPropVal.forEach(function(feature) {
            if ( feature.name ) { // only look at actual objects
              // all features we hit are declared (or overridden) in this model
              var featTr = self.DocFeatureInheritanceTracker.create({
                    isDeclared:true,
                    feature: feature,
                    model: newModelTr.model,
                    type: modProp.name,
                    fromTrait: isTrait
              });
              self.featureDAO.put(featTr);

              // for the models that extend this model, make sure they have
              // the feature too, if they didn't already have it declared (overridden).
              // isTrait is not set, as we don't distinguish between inherited trait features and
              // extendsModel features.
              previousExtenderTrackers.forEach(function(extModelTr) {
                self.featureDAO
                      .where(EQ(self.DocFeatureInheritanceTracker.PRIMARY_KEY,
                                extModelTr.model+":::"+feature.name))
                      .select(COUNT())(function(c) {
                          if (c.count <= 0) {
                            var featTrExt = self.DocFeatureInheritanceTracker.create({
                                isDeclared: false,
                                feature: feature,
                                model: extModelTr.model,
                                type: modProp.name });
                            self.featureDAO.put(featTrExt);
                          }
                      });
              });
            }
          });
        }
      });
            
      if (!isTrait) {
        // Check if we extend something, and recurse.
        if (!model.extendsModel) {
          newModelTr.inheritanceLevel = 0;
        } else {
          // add the tracker we're building to the list, for updates from our base models
          previousExtenderTrackers.push(newModelTr);
          // inheritance level will bubble back up the stack once we know where the bottom is.
          // pass a copy of previousExtenderTrackers so we know what to update in the traits section after.
          newModelTr.inheritanceLevel = 1 + this.loadFeaturesOfModel(
                            FOAM.lookup(model.extendsModel, this.X), previousExtenderTrackers.slice(0));
        }
      
        // Process traits with the same inheritance level we were assigned, since they appear first in the
        // apparent inheritance chain before our extendsModel.
        if (model.traits && model.traits.length > 0) {
          model.traits.forEach(function(trait) {
            var traitExtenderTrackers = previousExtenderTrackers.slice(0);
            traitExtenderTrackers.push(newModelTr);
            this.loadFeaturesOfModel(
              FOAM.lookup(trait, this.X), 
              traitExtenderTrackers, 
              newModelTr.inheritanceLevel);
          }.bind(this));
        }
      }


      // the tracker is now complete
      this.modelDAO.put(newModelTr);
      return newModelTr.inheritanceLevel;
    },

    debugLogFeatureDAO: function() {
      /* For debugging purposes, prints out the state of the FeatureDAO. */

      var features = [];
      console.log("Features DAO: ", this.featureDAO);
      this.featureDAO.select(features);
      console.log(features);

      var modelss = [];
      console.log("Model    DAO: ", this.modelDAO);
      this.modelDAO.select(modelss);
      console.log(modelss);
    },
    
    findSubModels: function(data) {
      if ( ! this.Model.isInstance(data) ) return;
      
      this.masterModelList.select(MAP(
        function(obj) {
          if ( data.isSubModel(obj) ) {
            this.subModelDAO.put(obj);
          }
        }.bind(this)
      ));
      
      console.log(this.subModelDAO);
    }

  }

  
});

CLASS({
  name: 'ModelDocView',
  package: 'foam.documentation',
  extendsModel: 'foam.documentation.DocView',
  documentation: 'Displays the documentation of the given Model.',
  traits: ['foam.documentation.DocModelFeatureDAOTrait'],
  
  documentation: function() {/*
    Displays the documentation for a given $$DOC{ref:'Model'}. The viewer will
    destroy and re-generate sub-views when the $$DOC{ref:'.data'} changes.
  */},

  imports: ['documentViewRef'],

  listeners: [
    {
      name: 'doScrollToFeature',
      isFramed: true,
      code: function() {
        this.scrollToFeature();
      }
    }
  ],

  methods: {

    init: function() {
      this.SUPER();

      this.documentViewRef.addListener(this.doScrollToFeature);
      this.generateFeatureDAO(this.data);
    },

    onValueChange_: function() {
      this.processModelChange();
    },
    
    destroy: function() {
      this.SUPER();
      this.documentViewRef.removeListener(this.doScrollToFeature);
    },

    processModelChange: function() {
      // abort if it's too early //TODO: (we import data and run its postSet before the rest is set up)
      if (!this.featureDAO || !this.modelDAO) return;
      this.generateFeatureDAO(this.data);
      this.updateHTML(); // not strictly necessary, but seems faster than allowing children to update individually
    },

    initInnerHTML: function() {
      /* If a feature is present in the this.documentViewRef $$DOC{ref:'foam.documentation.DocRef'},
        scroll to that location on the page. Otherwise scroll to the top. */
      this.SUPER();
      
      this.scrollToFeature();
    },

    scrollToFeature: function() {
      var self = this;
      var ref = self.documentViewRef.get();
      if (ref && ref.valid) {
        if (! // if we don't find an element to scroll to:
          ref.resolvedModelChain.slice(1).reverse().some(function(feature) {
            if (feature && feature.name) {
              element = this.X.$("scrollTarget_"+feature.name);
              if (element) {
                element.scrollIntoView(true);
                return true;
              }
              else return false;
            }
          })
        ) {
          // if we didn't find an element to scroll, use main view
          if (self.$) self.$.scrollIntoView(true);
        }
      }
    }
  }
});

CLASS({
  name: 'ModelFullPageDocView',
  package: 'foam.documentation',
  extendsModel: 'foam.documentation.ModelDocView',
  documentation: 'A full-page documentation view for Model instances.',

  documentation: "A full-page documentation view for $$DOC{ref:'Model'} instances.",

  templates: [

    function toInnerHTML()    {/*
<%    this.destroy(); %>
<%    if (this.data) {  %>
        $$data{ model_: 'foam.documentation.SummaryDocView', model: this.data.model_ }
        <div class="members">
          $$models{ model_: 'foam.documentation.FeatureListDocView', model: this.X.Model, featureType:'models' }
        </div>
        <div class="members">
          $$properties{ model_: 'foam.documentation.FeatureListDocView', model: this.X.Property, featureType:'properties' }
        </div>
        <div class="members">
          $$methods{ model_: 'foam.documentation.FeatureListDocView', model: this.X.Method, featureType:'methods' }
        </div>
        <div class="members">
          $$actions{ model_: 'foam.documentation.FeatureListDocView', model: this.X.Action, featureType:'actions' }
        </div>
        <div class="members">
          $$listeners{ model_: 'foam.documentation.FeatureListDocView', model: this.X.Method, featureType:'listeners' }
        </div>
        <div class="members">
          $$templates{ model_: 'foam.documentation.FeatureListDocView', model: this.X.Template, featureType:'templates' }
        </div>
        <div class="members">
          $$relationships{ model_: 'foam.documentation.FeatureListDocView', model: this.X.Relationship, featureType:'relationships' }
        </div>
        <div class="members">
          $$issues{ model_: 'foam.documentation.FeatureListDocView', model: this.X.Issue, featureType:'issues' }
        </div>
<%    } %>
    */}
  ]

});
CLASS({
  name: 'ModelSummaryDocView',
  package: 'foam.documentation',
  extendsModel: 'foam.documentation.DocView',

  imports: ['subModelDAO'],
  
  documentation: "A summary documentation view for $$DOC{ref:'Model'} instances.",

  properties: [
    'subModelDAO'
  ],
  
  methods: {
    onValueChange_: function() {
      this.updateHTML();
    }
  },
  
  templates: [

    function toInnerHTML()    {/*
<%    this.destroy(); %>
<%    if (this.data) {  %>
        <div class="introduction">
          <h1><%=this.data.name%></h1>
          <div class="model-info-block">
<%        if (this.data.model_ && this.data.model_.id && this.data.model_.id != "Model") { %>
            <p class="important">Implements $$DOC{ref: this.data.model_.id }</p>
<%        } else { %>
            <p class="important">$$DOC{ref:'Model'} definition</p>
<%        } %>
<%        if (this.data.sourcePath) { %>
            <p class="note">Loaded from <a href='<%=this.data.sourcePath%>'><%=this.data.sourcePath%></a></p>
<%        } else { %>
            <p class="note">No source path available.</p>
<%        } %>
<%        if (this.data.package) { %>
            <p class="important">Package <%=this.data.package%></p>
<%        } %>
<%        if (this.data.extendsModel) { %>
            <p class="important">Extends $$DOC{ref: this.data.extendsModel }</p>
<%        } %>
<%        if (this.data.traits && this.data.traits.length > 0) { %>
            <p class="important">Traits: $$traits{ model_: 'foam.documentation.TextualDAOListView', rowView: 'foam.documentation.DocFeatureModelRefView', mode: 'read-only' }</p>
<%        } %>
          <p class="important">Sub-models: $$subModelDAO{ model_: 'foam.documentation.TextualDAOListView', rowView: 'foam.documentation.DocFeatureModelDataRefView', mode: 'read-only' }</p>
          </div>
          $$documentation{ model_: 'foam.documentation.DocBodyView' }
        </div>
<%    } %>
    */}
  ]
});

CLASS({
  name: 'ModelRowDocView',
  package: 'foam.documentation',
  extendsModel: 'foam.documentation.DocView',
  documentation: 'A row documentation view for Model instances.',

  documentation: "A row documentation view for $$DOC{ref:'Model'} instances.",

  templates: [

    function toInnerHTML()    {/*
<%    this.destroy(); %>
<%    if (this.data) {  %>
        <p class="important"><%=this.data.id%></p>
<%    } %>
    */}
  ]

});

CLASS({
  name: 'InterfaceFullPageDocView',
  package: 'foam.documentation',
  extendsModel: 'foam.documentation.FullPageDocView',
  documentation: 'A full-page documentation view for Interface instances.',

  documentation: "A full-page documentation view for $$DOC{ref:'Interface'} instances.",

  templates: [

    function toInnerHTML()    {/*
<%    this.destroy(); %>
<%    if (this.data) {  %>
        $$data{ model_: 'foam.documentation.SummaryDocView', model: this.data.model_ }
        <div class="members">
          <p class="feature-type-heading">Methods:</p>
          <div class="memberList">$$methods{ model_: 'foam.views.DAOListView', rowView: 'foam.documentation.SimpleRowDocView' }</div>
        </div>
<%    } %>
    */}
  ]

});

CLASS({
  name: 'InterfaceSummaryDocView',
  package: 'foam.documentation',
  extendsModel: 'foam.documentation.SummaryDocView',
  documentation: 'Displays the documentation of the given interface.',

  methods: {
    onValueChange_: function() {
      this.updateHTML();
    }
  },

  
  templates: [

    function toInnerHTML()    {/*
<%    this.destroy(); %>
<%    if (this.data) {  %>
        <div class="introduction">
          <h1><%=this.data.name%></h1>
          <div class="model-info-block">
            <p class="important">Interface definition</p>
          
<%        if (this.data.package) { %>
            <p class="important">Package <%=this.data.package%></p>
<%        } %>
        
<%        if (this.data.description) { %>
            <p class="important">Description: <%=this.data.description%></p>
<%        } %>

<%        if (this.data.extends && this.data.extends.length > 0) { %>
            <p class="important">Extends: $$extends{ model_: 'foam.documentation.TextualDAOListView', rowView: 'foam.documentation.DocFeatureModelRefView', mode: 'read-only' }</p>
<%        } %>

            <div id="scrollTarget_<%=this.data.name%>" class="introduction">
              <h2><%=this.data.label%></h2>
              $$documentation{ model_: 'foam.documentation.DocBodyView' }
            </div>
          </div>
        </div>
<%    } %>
    */}
  ]

});





CLASS({
  name: 'DocumentationBookFullPageDocView',
  package: 'foam.documentation',
  extendsModel: 'foam.documentation.FullPageDocView',
  documentation: 'Displays the documentation of the given book.',

  templates: [

    function toInnerHTML()    {/*
<%    this.destroy(); %>
<%    if (this.data) {  %>
        $$data{ model_: 'foam.documentation.DocumentationBookSummaryDocView' }
        <div class="chapters">
          $$chapters{ model_: 'foam.documentation.DocChaptersView' }
        </div>
<%    } %>
    */}
  ]

});

CLASS({
  name: 'DocumentationBookSummaryDocView',
  package: 'foam.documentation',
  extendsModel: 'foam.documentation.SummaryDocView',
  documentation: 'Displays the documentation of the given book.',

  methods: {
    onValueChange_: function() {
      this.updateHTML();
    }
  },

  templates: [

    function toInnerHTML()    {/*
<%    this.destroy(); %>
<%    if (this.data) {  %>
        <div id="scrollTarget_<%=this.data.name%>" class="introduction">
          <h2><%=this.data.label%></h2>
          $$data{ model_: 'foam.documentation.DocBodyView' }
        </div>
<%    } %>
    */}
  ]

});


CLASS({
  name: 'DocumentationBookRowDocView',
  package: 'foam.documentation',
  extendsModel: 'foam.documentation.RowDocView',
  documentation: 'Displays the documentation of the given book.',

  templates: [

    function toInnerHTML()    {/*
<%    this.destroy(); %>
<%    if (this.data) {  %>
        <div id="scrollTarget_<%=this.data.name%>" class="introduction">
          <h2><%=this.data.label%></h2>
        </div>
<%    } %>
    */}
  ]

});


CLASS({
  name: 'DocBodyView',
  package: 'foam.documentation',
  extendsModel: 'foam.documentation.DocView',
  label: 'Documentation Body View Base',
  documentation: 'Base Model for documentation body-text views.',

  imports: ['documentViewRef'],

  properties: [
    {
      name: 'data',
      documentation: 'The documentation to display.',
      required: true,
      postSet: function() {
        if (this.data && this.data.body) {
          this.renderDocSourceHTML = TemplateUtil.lazyCompile(this.data.body);
        }
        
        if (this.data && (!this.model || this.model !== this.data.model_)) {
          this.model = this.data.model_;
        }
        this.childData = this.data;
        this.updateHTML();
      }
    },
  ],
  methods: {
    renderDocSourceHTML: function() {
      // only update if we have all required data
      if (this.data.body && this.documentViewRef
          && this.documentViewRef.get().resolvedRoot.valid) {
        // The first time this method is hit, replace it with the one that will
        // compile the template, then call that. Future calls go direct to lazyCompile's
        // returned function. You could also implement this the same way lazyCompile does...
        return this.renderDocSourceHTML();
      } else {
        console.warn("Rendered ", this, " with no data!");
        return ""; // no data yet
      }
    }
  },

  templates: [
    function toInnerHTML() {/*
      <%    this.destroy(); %>
      <%    if (this.data) {  %>
              <p><%=this.renderDocSourceHTML()%></p>
      <%    } %>
    */}
  ]
});





CLASS({
  name: 'DocRefView',
  package: 'foam.documentation',

  extendsModel: 'View',
  label: 'Documentation Reference View',
  documentation: 'The view of a documentation reference link.',

  requires: ['foam.documentation.DocRef as DocRef',
             'Documentation'],

  imports: ['documentViewRequestNavigation'],

  documentation: function() { /*
    <p>An inline link to another place in the documentation. See $$DOC{ref:'DocView'}
    for notes on usage.</p>
    */},

  properties: [

    {
      name: 'ref',
      documentation: 'Shortcut to set reference by string.',
      postSet: function() {
        this.docRef = this.DocRef.create({ ref: this.ref });
      },
      documentation: function() { /*
        The target reference in string form. Use this instead of setting
        $$DOC{ref:'.docRef'} directly if you only have a string.
        */}
    },
    {
      name: 'docRef',
      documentation: 'The reference object.',
      preSet: function(old,nu) { // accepts a string ref, or an DocRef object
        if (typeof nu === 'string') {
          return this.DocRef.create({ ref: nu });
        } else {
          return nu;
        }
      },
      postSet: function() {
        this.tooltip = this.docRef.ref;
        this.updateHTML();
        this.docRef.addListener(this.onReferenceChange);
      },
      documentation: function() { /*
        The target reference.
        */}
    },
    {
      name: 'text',
      documentation: 'Text to display instead of the referenced object&apos;s default label or name.',
      documentation: function() { /*
          Text to display instead of the referenced object&apos;s default label or name.
        */}
    },
    {
      name: 'className',
      defaultValue: 'docLink',
      hidden: true
    },
    {
      name: 'usePlural',
      defaultValue: false,
      documentation: 'If true, use the Model.plural instead of Model.name in the link text.',
      documentation: function() { /*
          If true, use the $$DOC{ref:'Model.plural',text:'Model.plural'}
          instead of $$DOC{ref:'Model.name',text:'Model.name'} in the link text,
          for convenient pluralization.
        */}
    },
    {
      name: 'acceptInvalid',
      model_: 'BooleanProperty',
      defaultValue: false,
      documentation: function() { /*
        If true, an invalid reference will just render as static text, rather than show an error.
      */}      
    }
  ],

  templates: [
    // kept tight to avoid HTML adding whitespace around it
    function toInnerHTML()    {/*<%
      this.destroy();
      if (!this.docRef || !this.docRef.valid) {
        if (this.acceptInvalid) {
          if (this.text && this.text.length > 0) {
            %><%=this.text%><%
          } else if (this.docRef) {
            %><%=this.docRef.ref%><%
          } else if (this.ref) {
            %><%=this.ref%><%
          } else {
            %>___<%
          }
        } else {
          if (this.docRef && this.docRef.ref) {
            %>[INVALID_REF:<%=this.docRef.ref%>]<%
          } else {
            %>[INVALID_REF:*no_reference*]<%
          }
        }
      } else {
        var mostSpecificObject = this.docRef.resolvedModelChain[this.docRef.resolvedModelChain.length-1];
        if (this.text && this.text.length > 0) {
          %><%=this.text%><%
        } else if (this.usePlural && mostSpecificObject.plural) {
          %><%=mostSpecificObject.plural%><%
        } else if (mostSpecificObject.name) {
          %><%=mostSpecificObject.name%><%
        } else if (mostSpecificObject.id) {
          %><%=mostSpecificObject.id%><%
        } else {
          %><%=this.docRef.ref%><%
        }
        this.on('click', this.onClick, this.id);
      }


      %>*/}
  ],

  methods: {
    init: function() {
      this.SUPER();
      this.tagName = 'span';

      this.setClass('docLinkNoDocumentation', function() {
        if (this.docRef && this.docRef.valid) {
          mostSpecificObject = this.docRef.resolvedModelChain[this.docRef.resolvedModelChain.length-1];
          return !( mostSpecificObject.documentation
                   || (mostSpecificObject.model_ && this.Documentation.isSubModel(mostSpecificObject.model_)));
        }
      }.bind(this), this.id);
    }
  },

  listeners: [
    {
      name: 'onReferenceChange',
      code: function(evt) {
        this.tooltip = this.docRef.ref;
        this.updateHTML();
      }
    },
    {
      name: 'onClick',
      code: function(evt) {
        if (this.docRef && this.docRef.valid && this.documentViewRequestNavigation) {
          this.documentViewRequestNavigation(this.docRef);
        }
      }
    }
  ],
});


CLASS({
  name: 'DocRef',
  package: 'foam.documentation',
  label: 'Documentation Reference',
  documentation: 'A reference to a documented Model or feature of a Model',

  imports: ['documentViewRef'],

  documentation: function() { /*
    <p>A link to another place in the documentation. See $$DOC{ref:'DocView'}
    for notes on usage.</p>
    <p>Every reference must have documentViewRef set on the context.
      This indicates the starting point of the reference for relative name
      resolution.</p>
    */},

  properties: [
    {
      name: 'resolvedModelChain',
      defaultValue: [],
      documentation: function() { /*
        If this $$DOC{ref:'foam.documentation.DocRef'} is valid, actual instances corresponding each
        part of the reference are in this list. The last item in the list
        is the target of the reference.
      */}
    },
    {
      name: 'resolvedRef',
      defaultValue: "",
      documentation: function() { /*
          The fully qualified name of the resolved reference, in the
          same format as $$DOC{ref:'.ref'}. It may match $$DOC{ref:'.ref'},
          if it was fully qualified (began with package, or Model name if no package).
      */}
    },
    {
      name: 'resolvedRoot',
      defaultValue: "",
      documentation: function() { /*
          The a $$DOC{ref:'foam.documentation.DocRef'} based on the fully qualified package and
          outer model names of this resolved reference. Does not contain features
          and ends with this.resolvedModelChain[0].
      */}
    },
    {
      name: 'ref',
      documentation: 'The reference to link. Must be of the form "Model", "Model.feature", or ".feature"',
      postSet: function() {
        this.resolveReference(this.ref);
      },
      documentation: function() { /*
        The string reference to resolve.
      */}
    },
    {
      name: 'valid',
      defaultValue: false,
      documentation: function() { /*
        Indicates if the reference is valid. $$DOC{ref:'.resolveReference'} will set
        $$DOC{ref:'.valid'} to true if resolution succeeds and
        $$DOC{ref:'.resolvedModelChain'} is usable, false otherwise.
      */}
    }
  ],

  methods: {
    init: function() {
      /* Warns if documentViewRef is missing from the context. */
      if (!this.documentViewRef) {
        //console.log("*** Warning: DocView ",this," can't find documentViewRef in its context "+this.X.NAME);
      } else {
      // TODO: view lifecycle management. The view that created this ref doesn't know
      // when to kill it, so the addListener on the context keeps this alive forever.
      // Revisit when we can cause a removeListener at the appropriate time.
        //        this.documentViewRef.addListener(this.onParentModelChanged);
      }
    },

    resolveReference: function(reference) {
  /* <p>Resolving a reference has a few special cases at the start:</p>
    <ul>
      <li>Beginning with ".": relative to $$DOC{ref:'Model'} in X.documentViewRef</li>
      <li>Containing only ".": the $$DOC{ref:'Model'} in X.documentViewRef</li>
      <li>The name after the first ".": a feature of the $$DOC{ref:'Model'} accessible by "getFeature('name')"</li>
      <li>A double-dot after the $$DOC{ref:'Model'}: Skip the feature lookup and find instances directly on
            the $$DOC{ref:'Model'} definition (<code>MyModel.chapters.chapName</code>)</li>
    </ul>
    <p>Note that the first name is a Model definition (can be looked up by this.X[modelName]),
     while the second name is an instance of a feature on that Model, and subsequent
     names are sub-objects on those instances.</p>
  */
      this.valid = false;

      if (!reference) return;

      args = reference.split('.');
      var foundObject;
      var model;

      // if model not specified, use parentModel
      if (args[0].length <= 0) {
        if (!this.documentViewRef || !this.documentViewRef.get().resolvedRoot.valid) {
          return; // abort
        }

        // fill in root to make reference absolute, and try again
        return this.resolveReference(this.documentViewRef.get().resolvedRoot.resolvedRef + reference);

      } else {
        // resolve path and model
        model = this.X[args[0]];
      }

      this.resolvedModelChain = [];
      this.resolvedRef = "";
      var newResolvedModelChain = [];
      var newResolvedRef = "";
      var newResolvedRoot = "";

      if ( ! model ) return;
      // Strip off package or contining Model until we are left with the last
      // resolving Model name in the chain (including inner models).
      // Ex: package.subpackage.ParentModel.InnerModel.feature => InnerModel
      var findingPackages = !model.model_;
      while (args.length > 0 && model && model[args[1]] && (findingPackages || (model[args[1]].model_ && model[args[1]].model_.id == 'Model'))) {
        newResolvedRef += args[0] + ".";
        newResolvedRoot += args[0] + ".";
        args = args.slice(1); // remove package/outerModel part
        model = model[args[0]];
        if (model.model_) findingPackages = false; // done with packages, now check for inner models
      };

      //TODO: do something with the package parts, resolve package refs with no model

      if ( ! model ) return;
      
      newResolvedModelChain.push(model);
      newResolvedRef += model.name;
      newResolvedRoot += model.name;
      // Check for a feature, and check inherited features too
      // If we have a Model definition, we make the jump from definition to an
      // instance of a feature definition here
      if (Model.isInstance(model) && args.length > 1)
      {
        if (args[1].length > 0) {
          // feature specified "Model.feature" or ".feature"
          foundObject = model.getFeature(args[1]);
          if (!foundObject) {
            return;
          } else {
            newResolvedModelChain.push(foundObject);
            newResolvedRef += "." + args[1];
          }
          remainingArgs = args.slice(2);
        }
      } else {
        foundObject = model;
        remainingArgs = args.slice(1);
      }

      // allow further specification of sub properties or lists
      if ( foundObject && remainingArgs.length > 0 ) {
        if ( ! remainingArgs.every(function (arg) {
            var newObject;

            // null arg is an error at this point
            if ( arg.length <= 0 ) return false;

            // check if arg is the name of a sub-object of foundObject
            var argCaller = Function('return this.'+arg);
            if (argCaller.call(foundObject)) {
              newObject = argCaller.call(foundObject);

            // otherwise if foundObject is a list, check names of each thing inside
            } else if (foundObject.mapFind) {
              foundObject.mapFind(function(f) {
                if (f && f.name && f.name === arg) {
                  newObject = f;
                }
              })
            }
            foundObject = newObject; // will reset to undefined if we failed to resolve the latest part
            if (!foundObject) {
              return false;
            } else {
              newResolvedModelChain.push(foundObject);
              newResolvedRef += "." + arg;
              return true;
            }
          })) {
          return; // the loop failed to resolve something
        }
      }

//      console.log("resolving "+ reference);
//      newResolvedModelChain.forEach(function(m) {
//        console.log("  ",m.name,m);
//      });

      this.resolvedModelChain = newResolvedModelChain;
      this.resolvedRef = newResolvedRef;
      this.resolvedRoot = this.X.foam.documentation.DocRef.create({
          resolvedModelChain: [ this.resolvedModelChain[0] ],
          resolvedRef: newResolvedRoot,
          valid: true,
          resolvedRoot: undefined // otherwise it would be the same as 'this'
      });
      this.valid = true;
    },
  },

});




CLASS({
  name: 'FeatureListDocView',
  package: 'foam.documentation',
  extendsModel: 'foam.documentation.DocView',
  documentation: 'Displays the documentation of the given feature list.',

  requires: [ 'foam.views.DAOListView',
              'foam.views.CollapsibleView',
              'foam.documentation.DocFeatureCollapsedView',
              'foam.documentation.DocFeatureInheritanceTracker'
              ],

  imports: ['featureDAO', 'documentViewRef'],

  properties: [
    {
      name:  'data',
      documentation: 'The array property whose features to view.',
      postSet: function() {
        this.dao = this.data;
        this.childData = this.data;
      }
    },
    {
      name: 'model',
      documentation: 'The model definition of the items in the data array.'
    },
    {
      name: 'featureType',
      documentation: 'The property name from which data is set (such as "properties" or "methods")',
      type: 'String',
      postSet: function() {
        // only render once we have both featureType and dao
        if ( ! this.filteredDAO && this.dao ) {
          this.filteredDAO = this.dao;
        }

      }
    },
    {
      name: 'featureDAO'
    },
    {
      name:  'dao',
      model_: 'DAOProperty',
      defaultValue: [],
      onDAOUpdate: function() {
        // only render once we have both featureType and dao
        if ( this.featureType ) {
          this.filteredDAO = this.dao;
        }
      }
    },
    {
      name:  'filteredDAO',
      model_: 'DAOProperty',
      onDAOUpdate: function() {
        var self = this;
        if (!this.documentViewRef) {
          console.warn("this.documentViewRef non-existent");
        } else if (!this.documentViewRef.get()) {
          console.warn("this.documentViewRef not set");
        } else if (!this.documentViewRef.get().valid) {
          console.warn("this.documentViewRef not valid");
        }

        this.selfFeaturesDAO = [].sink;
        this.featureDAO
          .where(
                AND(AND(EQ(this.DocFeatureInheritanceTracker.MODEL, this.documentViewRef.get().resolvedRoot.resolvedModelChain[0].id),
                        EQ(this.DocFeatureInheritanceTracker.IS_DECLARED, true)),
                    CONTAINS(this.DocFeatureInheritanceTracker.TYPE, this.featureType))
                )
          .select(MAP(this.DocFeatureInheritanceTracker.FEATURE, this.selfFeaturesDAO));

        this.inheritedFeaturesDAO = [].sink;
        this.featureDAO
          .where(
                AND(AND(EQ(this.DocFeatureInheritanceTracker.MODEL, this.documentViewRef.get().resolvedRoot.resolvedModelChain[0].id),
                        EQ(this.DocFeatureInheritanceTracker.IS_DECLARED, false)),
                    CONTAINS(this.DocFeatureInheritanceTracker.TYPE, this.featureType))
                )
          .select(MAP(this.DocFeatureInheritanceTracker.FEATURE, this.inheritedFeaturesDAO));

        this.updateHTML();
      }
    },
    {
      name:  'selfFeaturesDAO',
      model_: 'DAOProperty',
      documentation: function() { /*
          Returns the list of features (matching this feature type) that are
          declared or overridden in this $$DOC{ref:'Model'}
      */},
      onDAOUpdate: function() {
        var self = this;
        this.selfFeaturesDAO.select(COUNT())(function(c) {
          self.hasFeatures = c.count > 0;
        });
      }
    },
    {
      name:  'inheritedFeaturesDAO',
      model_: 'DAOProperty',
      documentation: function() { /*
          Returns the list of features (matching this feature type) that are
          inherited but not declared or overridden in this $$DOC{ref:'Model'}
      */},
      onDAOUpdate: function() {
        var self = this;
        this.inheritedFeaturesDAO.select(COUNT())(function(c) {
          self.hasInheritedFeatures = c.count > 0;
        });
      }
    },
    {
      name: 'hasFeatures',
      defaultValue: false,
      postSet: function(_, nu) {
        this.updateHTML();
      },
      documentation: function() { /*
          True if the $$DOC{ref:'.selfFeaturesDAO'} is not empty.
      */}
    },
    {
      name: 'hasInheritedFeatures',
      defaultValue: false,
      postSet: function(_, nu) {
        this.updateHTML();
      },
      documentation: function() { /*
          True if the $$DOC{ref:'.inheritedFeaturesDAO'} is not empty.
      */}
    },
    {
      name: 'tagName',
      defaultValue: 'div'
    },
  ],

  templates: [
    function toInnerHTML()    {/*
    <%    this.destroy();
          if (!this.hasFeatures && !this.hasInheritedFeatures) { %>
          <% //  <p class="feature-type-heading">No <%=this.model.plural%>.</p> %>
    <%    } else {
            if (this.hasFeatures) { %>
              <p class="feature-type-heading"><%=this.model.plural%>:</p>
              <div class="memberList">$$selfFeaturesDAO{ model_: 'foam.views.DAOListView', rowView: 'foam.documentation.RowDocView', model: this.model }</div>
      <%    }
            if (this.hasInheritedFeatures) { %>
              <p class="feature-type-heading">Inherited <%=this.model.plural%>:</p>
      <%
              var fullView = this.DAOListView.create({ data$: this.inheritedFeaturesDAO$, rowView: 'foam.documentation.RowDocView', model: this.model });
              var collapsedView = this.DocFeatureCollapsedView.create({data$: this.inheritedFeaturesDAO$});
              %>
              <div class="memberList inherited">$$inheritedFeaturesDAO{ model_: 'foam.views.CollapsibleView', collapsedView: collapsedView, fullView: fullView, showActions: true }</div>
      <%    } %>
    <%    } %>
    */}
  ],

});

CLASS({
  name: 'DocFeatureCollapsedView',
  package: 'foam.documentation',
  extendsModel: 'foam.documentation.DocBodyView',
  documentation: 'A generic view for collapsed sets.',

  properties: [
    {
      name: 'data',
      postSet: function() {
        if (this.data && this.data.select) {
          this.dao = this.data;
        } else {
          this.dao = [];
        }
      }
    },
    {
      name:  'dao',
      model_: 'DAOProperty',
      defaultValue: [],
      onDAOUpdate: function() {
        var self = this;
        this.dao.select(COUNT())(function(c) {
          self.count = c.count;
        });
      }
    },
    {
      name: 'count',
      postSet: function() {
        this.updateHTML();
      }
    }
  ],

  templates: [
    function toInnerHTML() {/*
      <p><%=this.count%> more...</p>
    */}
  ]
});


