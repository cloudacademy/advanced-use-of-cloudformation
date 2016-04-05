

var AWS = require('aws-sdk');
var CloudFormation = new AWS.CloudFormation();
var DynamoDB = new AWS.DynamoDB.DocumentClient();
var Lambda = new AWS.Lambda();
var ARGS = getCLIArgs();
var STACK_NAME = ARGS.stack;

console.log('~~~~~~~~~~~~~~');
console.log('Running our stack integration test...');

var TEST_OBJECT = {
  id: 'foobar',
  testable_prop: 'Hello, world!'
};

console.log('Grabbing the Lambda and DynamoDB Table names...');
CloudFormation.describeStacks({
  StackName: STACK_NAME
}, function(err, data) {
  if (err) {
      console.error('An error occurred during ping.');
      console.error(err);
      process.exit(1);
    } else if (!(data && Array.isArray(data.Stacks) && data.Stacks.length)) {
      console.error('The ping came back, but CloudFormation showed no Stack.');
      console.error('Failing out with exit code 1.');
      process.exit(1);
    } else {
      var stack = data.Stacks[0];
      var outputs = stack.Outputs.reduce(function(hash, output) {
        hash[output.OutputKey] = output.OutputValue;
        return hash;
      }, {});
      console.log('Found outputs: %j', outputs);
      Lambda.invoke({
        FunctionName: outputs.LambdaName, 
        InvocationType: 'RequestResponse',
        LogType: 'None',
        Payload: JSON.stringify(TEST_OBJECT)
      }, function(err, data) {
        if (err) {
          console.error('An error occurred during Lambda invocation.');
          console.error(err);
          process.exit(1);
        } else {
          console.log('Lambda invocation passed, now moving to Dynamo Check.');
          DynamoDB.get({
            Key: {
              id: TEST_OBJECT.id
            },
            TableName: outputs.TableName
          }, function(err, data) {
            if (err) {
              console.error('Error getting Dynamo object!');
              console.error(err);
              process.exit(1);
            }
            console.log('Got the object back!');
            if (!TEST_OBJECT.testable_prop === data.testable_prop) {
              console.error('Oops! Inserted object did not validate!');
              console.error('EXPECTED: %j', TEST_OBJECT);
              console.error('FOUND: %j', data);
              process.exit(1);
            }
            console.log('Object matched, now cleaning the object out with a delete.');
            DynamoDB.delete({
              Key: {
                id: TEST_OBJECT.id
              },
              TableName: outputs.TableName
            }, function(err, data) {
              if (err) {
                console.error('Error doing cleanup!');
                console.error(err);
                process.exit(1);
              }
              console.log('Cleaned up correctly! Stack integration test passed!');
              process.exit(0);
            });
          });
        }
      });
    }
});





function getCLIArgs() {
  return process.argv.reduce(function(hash, arg, idx, array) {

    var next = array[idx + 1];

    // We have identified a keyname
    if (!arg.indexOf('--')) {
      // Lookahead for non-key
      //   ? Remove leading dashes
      //   : Non-value keys are boolean
      hash[arg.substr(2).toLowerCase()] = next && next.indexOf('--') ? next : true;
    }

    return hash;

  }, {});
}
