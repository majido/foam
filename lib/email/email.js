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

CLASS({
  name: 'EMailLabelProperty',
  extendsModel: 'BooleanProperty',
  properties: [
    { name: 'labelName', required: true },
    {
      name: 'setter',
      defaultValue: function(v, name) {
        var old = this.v;
        var label = this.model_[name.constantize()].labelName;
        if ( v ) this.addLabel(label); else this.removeLabel(label);
        this.propertyChange_(this.propertyTopic(name), old, v);
      }
    },
    {
      name: 'getter',
      defaultValue: function(name) {
        var label = this.model_[name.constantize()].labelName;
        return this.hasLabel(label);
      }
    }
  ]
});


CLASS({
  name: 'EMailMutationAction',
  extendsModel: 'Action',
  properties: [
    {
      model_: 'BooleanProperty',
      name: 'backOnComplete',
      defaultValue: false
    },
    {
      model_: 'FunctionProperty',
      name: 'action',
      preSet: function(_, a) {
        return function(X, action) {
          var obj = this;
          a.apply(obj, arguments);
          var self = this;
          var sink = action.backOnComplete ?
            { put: function() { X.stack.back(); },
              error: function() { X.stack.back(); } } : undefined;
          X.EMailDAO && X.EMailDAO.put(obj, sink);
        };
      }
    }
  ]
});


CLASS({
  name: 'EMail',
  plural: 'EMail',

  tableProperties: [
    'from',
    'subject',
    'timestamp'
  ],

  properties:
  [
    {
      model_: 'StringProperty',
      name: 'id',
      label: 'Message ID',
      mode: 'read-write',
      required: true,
      displayWidth: 50,
      hidden: true,
      compareProperty: hexStringCompare
    },
    {
      model_: 'StringProperty',
      name: 'convId',
      label: 'Conversation ID',
      mode: 'read-write',
      hidden: true,
      displayWidth: 30
    },
    {
      model_: 'DateProperty',
      name: 'timestamp',
      aliases: ['time', 'modified', 't'],
      label: 'Date',
      type: 'String',
      mode: 'read-write',
      required: true,
      displayWidth: 45,
      displayHeight: 1,
      view: 'TextFieldView',
      tableWidth: '100',
      preSet: function (_, d) {
        return ( typeof d === 'string' || typeof d === 'number' ) ? new Date(d) : d;
      },
      factory: function() { return new Date(); }
    },
    {
      model_: 'StringProperty',
      name: 'from',
      shortName: 'f',
      mode: 'read-write',
      required: true,
      displayWidth: 90,
      tableWidth: '120',
      tableFormatter: function(t) {
        var ret;
        if (t.search('<.*>') != -1) {
          // If it's a name followed by <email>, just use the name.
          ret = t.replace(/<.*>/, '').replace(/"/g, '');
        } else {
          // If it's just an email, only use everything before the @.
          ret = t.replace(/@.*/, '');
        }
        return ret.trim();
      },
      factory: function() { return GLOBAL.user || ""; }
    },
    {
      model_: 'StringArrayProperty',
      name: 'to',
      shortName: 't',
      required: true,
      displayWidth: 90,
      tableFormatter: function(t) { return t.replace(/"/g, '').replace(/<.*/, ''); }
    },
    {
      model_: 'StringArrayProperty',
      name: 'cc',
      required: true,
      displayWidth: 90,
      tableFormatter: function(t) { return t.replace(/"/g, '').replace(/<.*/, ''); }
    },
    {
      model_: 'StringArrayProperty',
      name: 'bcc',
      required: true,
      displayWidth: 90,
      tableFormatter: function(t) { return t.replace(/"/g, '').replace(/<.*/, ''); }
    },
    {
      model_: 'StringArrayProperty',
      name: 'replyTo'
    },
    {
      model_: 'Property',
      name: 'subject',
      shortName: 's',
      type: 'String',
      mode: 'read-write',
      required: true,
      displayWidth: 100,
      tableWidth: '45%',
      view: 'TextFieldView'
    },
    {
      model_: 'StringArrayProperty',
      name: 'labels',
      view: 'LabelView',
      postSet: function(_, a) {
        if ( a ) for ( var i = 0 ; i < a.length ; i++ ) a[i] = a[i].intern();
      },
      help: 'Email labels.'
    },
    {
      model_: 'Property',
      name: 'attachments',
      label: 'Attachments',
      tableLabel: '@',
      type: 'Array[Attachment]',
      subType: 'Attachment',
      view: 'ArrayView',
      factory: function() { return []; },
      tableWidth: '20',
      tableFormatter: function(a) { return a.length ? a.length : ''; },
      help: 'Email attachments.'
    },
    {
      model_: 'StringProperty',
      name: 'body',
      shortName: 'b',
      label: '',
      //         view: 'RichTextView',
      view: 'TextFieldView',
      displayWidth: 70,
      displayHeight: 20,
      help: 'Email message body.',
      summaryFormatter: function(t) {
        return '<div class="messageBody">' + t.replace(/\n/g,'<br/>') + '</div>';
      }
    },
    {
      model_: 'EMailLabelProperty',
      name: 'starred',
      labelName: 'STARRED'
    },
    {
      model_: 'EMailLabelProperty',
      name: 'unread',
      labelName: 'UNREAD'
    },
    {
      model_: 'EMailLabelProperty',
      name: 'isDraft',
      labelName: 'DRAFT'
    },
    {
      model_: 'EMailLabelProperty',
      name: 'inInbox',
      labelName: 'INBOX'
    },
    {
      model_: 'StringProperty',
      name: 'snippet',
      mode: 'read-only',
      defaultValueFn: function() { return this.body.substr(0, 100); }
    },
    {
      model_: 'BooleanProperty',
      name: 'messageSent',
      defaultValue: false,
      help: 'True if the user has marked this message to be sent.'
    }
  ],

  methods: {
    updateLabelByName: function(id) {
      var self = this;
      EMailLabelDAO.find(EQ(EMailLabel.DISPLAY_NAME, id), {put: function(label) {
        var mail = self.clone(); mail.toggleLabel(label.id); EMailDAO.put(mail);
      }});
    },
    hasLabel: function(l) { return this.labels.indexOf(l) != -1; },
    toggleLabel: function(l) { this.hasLabel(l) ? this.removeLabel(l) : this.addLabel(l); },
    addLabel: function(l) { this.labels = this.labels.deleteF(l).pushF(l); },
    removeLabel: function(l) { this.labels = this.labels.deleteF(l); },
    atoMime: function(ret) {
      // Filter attachments into inline and non-inline attachments.
      var inline = [];
      var attachments = []
      for ( var i = 0; i < this.attachments.length; i++ ) {
        if ( this.attachments[i].inline )
          inline.push(this.attachments[i]);
        else
          attachments.push(this.attachments[i]);
      }

      // Utility function for defining unique bounday values.
      var newBoundary = (function() {
        var boundary = Math.floor(Math.random() * 10000);
        return function() { return (boundary += 1).toString(16); };
      })();

      var body = "Content-Type: text/html; charset=UTF-8\r\n\r\n";

      var fragment = new DocumentFragment();
      fragment.appendChild(document.createElement('body'));
      fragment.firstChild.innerHTML = this.body;
      var images = fragment.querySelectorAll('img');
      for ( var i = 0; i < images.length; i++ ) {
        if ( images[i].id ) {
          images[i].src = 'cid:' + images[i].id;
          images[i].removeAttribute('id');
        }
      }
      body += fragment.firstChild.innerHTML + "\r\n";

      var i;
      var self = this;

      var addAttachments = function(attachments, inline) {
        return aseq(
          function(ret) {
            boundary = newBoundary();

            body = "Content-Type: multipart/" +
              ( inline ? 'related' : 'mixed' ) + "; boundary=" + boundary + "\r\n\r\n"
              + "--" + boundary + "\r\n"
              + body
              + "\r\n--" + boundary;
            i = 0;
            ret();
          },
          awhile(
            function() { return i < attachments.length; },
            aseq(
              function(ret) {
                var att = attachments[i];
                i++;
                att.atoMime(ret);
              },
              function(ret, data) {
                body += "\r\n" + data;
                body += "--" + boundary;
                ret();
              })),
          function(ret) {
            body += "--";
            ret();
          });
      };

      aseq(
        aif(inline.length > 0,
            addAttachments(inline, true)),
        aif(attachments.length > 0,
            addAttachments(attachments, false)))(function() {
              body = "From: " + self.from + "\r\n" +
                "To: " + self.to.join(', ') + "\r\n" +
                (self.cc.length ? "Cc: " + self.cc.join(", ") + "\r\n" : "") +
                (self.bcc.length ? "Bcc: " + self.bcc.join(", ") + "\r\n" : "") +
                "Subject: " + self.subject + "\r\n" +
                body;
              ret(body);
            });
    }
  },

  actions: [
    {
      model_: 'EMailMutationAction',
      name: 'send',
      backOnComplete: true,
      help: 'Send the email.',
      isAvailable: function() { return this.isDraft; },
      isEnabled: function() { return ! this.messageSent; },
      action: function () { this.messageSent = true; }
    },
    {
      model_: 'Action',
      name: 'reply',
      help: 'Reply to an email.',
      action: function () {
        var replyMail = this.X.EMail.create({
          to: [this.from],
          subject: this.subject,
          body: this.body,
          labels: ['DRAFT'],
        });
        openComposeView(replyMail);
      }
    },
    {
      model_: 'Action',
      name: 'replyAll',
      help: 'Reply to all recipients of an email.',
      action: function () {
        var replyMail = this.X.EMail.create({
          to: [this.from],
          cc: this.cc,
          subject: this.subject,
          body: this.body,
          labels: ['DRAFT'],
        });

        for ( var i = 0 ; i < this.to ; i++ ) {
          replyMail.to.push(this.to[i]);
        }
        openComposeView(replyMail);
      }
    },
    {
      model_: 'Action',
      name: 'forward',
      help: 'Forward an email.',
      action: function () {
        var forwardedMail = this.X.EMail.create({
          subject: this.subject,
          body: this.body,
          labels: ['DRAFT'],
        });
        openComposeView(forwardedMail);
      }
    },
    {
      model_: 'EMailMutationAction',
      name: 'star',
      help: 'Star an email.',
      action: function () { this.toggleLabel('STARRED'); }
    },
    {
      model_: 'EMailMutationAction',
      name: 'archive',
      help: 'Archive an email.',
      isAvailable: function() { return this.hasLabel('INBOX'); },
      action: function () { this.removeLabel('INBOX'); }
    },
    {
      model_: 'EMailMutationAction',
      name: 'moveToInbox',
      help: 'Un-archive an email.',
      isAvailable: function() { return ! this.hasLabel('INBOX'); },
      action: function() {
        this.addLabel('INBOX');
        this.removeLabel('SPAM');
        this.removeLabel('TRASH');
      }
    },
    {
      model_: 'EMailMutationAction',
      name: 'spam',
      help: 'Report an email as SPAM.',
      isAvailable: function() { return ! this.hasLabel('SPAM'); },
      action: function () {
        this.removeLabel('INBOX');
        this.addLabel('SPAM');
      }
    },
    {
      model_: 'EMailMutationAction',
      name: 'trash',
      help: 'Move an email to the trash.',
      isAvailable: function() { return ! this.hasLabel('TRASH'); },
      action: function () {
        this.removeLabel('INBOX');
        this.addLabel('TRASH');
      }
    },
    {
      model_: 'EMailMutationAction',
      name: 'markRead',
      help: 'Mark an email as read.',
      isAvailable: function() { return this.hasLabel('UNREAD'); },
      action: function () { this.removeLabel('UNREAD'); }
    },
    {
      model_: 'EMailMutationAction',
      name: 'markUnread',
      help: 'Mark an email as unread.',
      isAvailable: function() { return ! this.hasLabel('UNREAD'); },
      action: function () { this.addLabel('UNREAD'); }
    }
  ]
});


CLASS({
  name: 'ConversationAction',
  extendsModel: 'Action',

  properties: [
    {
      name: 'name',
      defaultValueFn: function() {
        return this.delegate ? this.delegate.name : 'ConversationAction';
      }
    },
    {
      name: 'iconUrl',
      defaultValueFn: function() { return this.delegate.iconUrl; }
    },
    {
      name: 'help',
      defaultValueFn: function() { return this.delegate.help; }
    },
    {
      name: 'delegate'
    },
    {
      name: 'action',
      defaultValue: function(action) {
        var emails = this.emails;
        if ( action.applyOnAll ) {
          emails.forEach(function(e) {
            action.delegate.action.call(e);
          });
        } else if ( emails.length ) {
          var e = emails[emails.length - 1];
          action.delegate.action.call(e);
        }
      }
    },
    {
      name: 'applyOnAll',
      defaultValue: true
    }
  ]
});


CLASS({
  name: 'Conversation',

  tableProperties: [
    'recipients',
    'subject',
    'timestamp'
  ],

  properties: [
    {
      name: 'id'
    },
    {
      name: 'recipients',
      tableWidth: '100'
    },
    {
      model_: 'StringProperty',
      name: 'subject',
      shortName: 's',
      mode: 'read-write',
      required: true,
      displayWidth: 100,
      tableWidth: '45%',
      view: 'TextFieldView',
      tableFormatter: function(s, self, view) {
        var sanitizedSubject = view.strToHTML(s);
        return self.isUnread ?
          '<b>' + sanitizedSubject + '</b>' :
          sanitizedSubject ;
      }
    },
    {
      name: 'timestamp',
      model_: 'DateProperty',
      tableWidth: '75'
    },
    {
      name: 'emails',
      view: 'EMailsView'
    },
    {
      name: 'isUnread'
    },
    {
      model_: 'StringArrayProperty',
      name: 'labels',
      view: 'LabelView',
      help: 'Email labels.',
      postSet: function(oldValue, newValue) {
        if (!newValue || !newValue.length) return;
        var self = this;
        this.isUnread = false;
        EMailLabelDAO.find(EQ(EMailLabel.DISPLAY_NAME, '^u'), {put: function(unreadLabel) {
          newValue.forEach(function(label) {
            if (label == unreadLabel.id) {
              self.isUnread = true;
            }
          });
        }});
      }
    }
  ],

  listeners: [
    {
      // For some reason, when isFramed is true, nothing renders.
      //isFramed: true,
      name: 'update',
      code: function() {
        if ( ! this.emails || this.emails.length === 0 ) return;
        // TODO the primary email should be the most recent email that matches the query
        // that we haven't yet given this model.
        var primaryEmail = this.emails[0];

        this.subject = primaryEmail.subject;

        var allSenders = [];
        var seenSenders = {};
        for (var i = 0, m; m = this.emails[i]; i++) {
          // TODO this needs work:
          // 1. bold unread
          // 2. strip last names when more than one name
          // 3. limit to 3 senders (first sender followed by last two i think)
          // 4. dont dedupe senders that have an unread and a read message. They should show twice.
          if (!seenSenders[m.from]) {
            allSenders.push(EMail.FROM.tableFormatter(m.from));
            seenSenders[m.from] = true;
          }
        }
        this.recipients = allSenders.join(', ');
        if ( this.emails.length > 1 ) {
          this.recipients += ' (' + this.emails.length + ')';
        }
        this.timestamp = primaryEmail.timestamp;

        // Concat all of the labels together.
        var m = {};
        this.emails.forEach(function(e) { e.labels.forEach(function(l) { m[l] = 1; }); });
        this.labels = Object.keys(m);
      }
    }
  ],

  methods: {
    put: function(email) {
      if ( ! this.emails ) this.emails = [];
      this.emails.put(email);
      this.id = email.convId;
      this.update();
    },
    remove: function(email) {
      if ( ! this.emails ) this.emails = [];
      for ( var i = 0; i < this.emails.length; i++ ) {
        if ( email.id === this.emails[i].id ) {
          this.emails.splice(i--, 1);
        }
      }
      this.update();
    }
  },

  actions: [
    {
      model_: 'ConversationAction',
      delegate: EMail.REPLY,
      applyOnAll: false
    },
    {
      model_: 'ConversationAction',
      delegate: EMail.REPLY_ALL,
      applyOnAll: false
    },
    {
      model_: 'ConversationAction',
      delegate: EMail.FORWARD,
      applyOnAll: false
    },
    {
      model_: 'ConversationAction',
      delegate: EMail.STAR,
      applyOnAll: false
    },
    {
      model_: 'ConversationAction',
      delegate: EMail.ARCHIVE
    },
    {
      model_: 'ConversationAction',
      delegate: EMail.SPAM
    },
    {
      model_: 'ConversationAction',
      delegate: EMail.TRASH
    },
    {
      model_: 'ConversationAction',
      delegate: EMail.OPEN
    }
  ]
});
