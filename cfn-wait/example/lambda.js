console.log('Loading function');

var AWS = require('aws-sdk');
var dynamo = new AWS.DynamoDB.DocumentClient();

exports.handler = function(event, context) {
  console.log('Received event: %j', event);

  var TABLE = event.Table;

  dynamo.put({
    Item: event,
    TableName: TABLE
  }, function(err, data) {
    if (err) {
      console.error('Request failure! %j', err);
      return context.done(err, null);
    }
    console.log('Request success! %j', data);
    context.done(err, item);
  });

  function errorOut(message) {
    context.done(message || 'Not a valid request for this entity.', null);
  }

};