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
var canv = X.diagram.Diagram.create({width: 1000, height: 300});
canv.write(document);

var outerLayout = X.diagram.LinearLayout.create({ width : 500, height: 300});
canv.addChild(outerLayout);

var spacer1e = X.foam.graphics.Spacer.create({ fixedWidth: 200 });
outerLayout.addChild(spacer1e);

var vlay1 = X.diagram.LinearLayout.create({width: 120, height: 300, orientation: 'vertical'});
outerLayout.addChild(vlay1);
var vlay2 = X.diagram.LinearLayout.create({width: 120, height: 300, orientation: 'vertical'});
outerLayout.addChild(vlay2);

CLASS({
  name: 'BorderLabel',
  extendsModel: 'foam.graphics.Label',
  traits: ['foam.graphics.BorderTrait']

});

var spacer1 = X.foam.graphics.Spacer.create({ });
vlay1.addChild(spacer1);

var block1 = X.diagram.Block.create({
       x: 0,
       y: 20,
       border: 'black',
       background: 'white',
       width: 120,
       height: 30,
  
}, canv.X); 
block1.horizontalConstraints.min = 50;
block1.horizontalConstraints.max = 50;
block1.verticalConstraints.min = 100;
block1.verticalConstraints.max = 100;

vlay1.addChild(block1);

var sect1 = X.diagram.Section.create({
  title: 'A Model'
}, canv.X);
block1.addChild(sect1);
var sect2 = X.diagram.Section.create({
  title: 'propertyName',
  titleFont: '12px Roboto'
}, canv.X);
block1.addChild(sect2);




var spacer1b = X.foam.graphics.Spacer.create({
  fixedHeight: 20,
  fixedWidth: 30
});
vlay1.addChild(spacer1b);


var label1 = X.BorderLabel.create({
       x: 60,
       y: 25,
       color: 'red',
       width: 120,
       height: 30,
       text: 'Hello World',
       border: 'red',
       borderWidth: 2

});
vlay1.addChild(label1);

var rect3 = X.foam.graphics.Rectangle.create({
       x: 120,
       y: 30,
       border: 'red',
       width: 120,
       height: 30,

});
vlay1.addChild(rect3);

var spacer2 = X.foam.graphics.Spacer.create({
  fixedHeight: 20,
  fixedWidth: 50
});
outerLayout.addChild(spacer2);


var spacer5 = X.foam.graphics.Spacer.create();
spacer5.verticalConstraints.stretchFactor = 3;
vlay2.addChild(spacer5);

var block2 = X.diagram.Block.create({
       x: 120,
       y: 0,
       border: 'green',
       background: 'white',
       width: 120,
       height: 50,

}, canv.X);
var block2Margin = X.diagram.Margin.create({ left: 8, top: 8, bottom: 8, right: 8, width: 80, height: 80});
block2Margin.addChild(block2);
//vlay2.addChild(block2Margin);

var block2LockerLayout = X.diagram.LockToPreferredLayout.create({}, canv.X);
block2LockerLayout.addChild(block2Margin);

canv.addChild(block2LockerLayout);

var sect1b = X.diagram.Section.create({
  title: 'More Model'
}, canv.X);
block2.addChild(sect1b);
var sect2b = X.diagram.Section.create({
  title: 'imports',
  titleFont: 'italic 12px Roboto'
}, canv.X);
block2.addChild(sect2b);
var spacer3 = X.foam.graphics.Spacer.create();
spacer3.verticalConstraints.stretchFactor = 1;
block2.addChild(spacer3);


var link = X.diagram.Link.create({color: 'blue', arrowStyle:'generalization'}, canv.X);
link.start = block1.myLinkPoints;
link.end = block2.myLinkPoints;
canv.addChild(link);

var link2 = X.diagram.Link.create({color: 'blue', arrowStyle:'composition'}, canv.X);
link2.start = sect1.myLinkPoints;
link2.end = sect1b.myLinkPoints;
canv.addChild(link2);


//vlay1.performLayout();
var mouse = X.Mouse.create();
mouse.connect(canv.$);

Events.dynamic(function() { mouse.x; mouse.y; }, function() {
  //outerLayout.width = mouse.x;
  //outerLayout.height = mouse.y;
  block2.x = mouse.x;
  block2.y = mouse.y;
});


///////////////////Editors

var editors = [block2, block2Margin, sect1b, sect2b, outerLayout];

editors.forEach(function(thing) {
  var editor = X.DetailView.create({ data: thing});
  editor.write(document);

});


