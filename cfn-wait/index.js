

// This example is in node.js.
// I do my best to explain what is going on,
//     so that non-node.js students can understand 
//     conceptually what we are trying to do.

// USAGE: node stack-wait.js


// Import / require the aws-sdk.
var AWS = require('aws-sdk');


// This is a helper function I defined to give me a key-value hash of --arg <value>s.
var ARGS = getCLIArgs();

// We need to know the stack name to do th lookup...
var STACK_NAME = ARGS.stack;

// ... and some timing controls to prevent over-waiting.
// positiveInt is a function I defined to process the Strings from the STDIN into positive integers.
var PING_INTERVAL = positiveInt(ARGS.interval) || 60;
var PING_MAX_COUNT = positiveInt(ARGS.max) || 10;

// Setting up the CloudFormation namespace object to use below.
var CloudFormation = new AWS.CloudFormation();

// Checking if the STACK_NAME had a truthy value coming from the CLI as arg --stack <stack-name>
if (!STACK_NAME) {
  throw new Error('You must provide a --stack to the arguments: ARN or Stack Name.');
}

// This is the format that the AWS Node.js SDK for CloudFormation wants us to use 
//   when asking CloudFormation to run a describe-stacks operation.
// The "StackName" parameter is common across the CLI, HTTPS APIs, and all SDKs.
var pingRequestParams = {
  StackName: STACK_NAME
};

// We need to cound the number of pings we make in order to implement our timeout functionality.
var passedPings = 0;

// In node.js, 'console.log' lets me send formatted strings to STDOUT for debugging and logging.
console.log('Beginning stack ping wait cycle.');
console.log('Will check every %s seconds, max %s checks.', PING_INTERVAL, PING_MAX_COUNT);

// Run the first check for completion against the stack.
ping();

function ping() {
  console.log('Sending a ping...');

  // Begin the asynchronous request to CloudFormation, asking to see stack state.
  CloudFormation.describeStacks(pingRequestParams, function(err, data) {

    // This is node.js, so we enter a new anonymous function 
    //     to represent the continuation at a later time.
    // To all non-node.js developers - this function executes 
    //     when the 'describeStacks' operation finishes.
    // Note the function gets 'err' and 'data' back, where 'err'
    //     is defined if and only if there is an error, and is null otherwise.

    if (err) {
      console.error('An error occurred during ping.');
      console.error(err);
      process.exit(1);
    } else if (!(data && Array.isArray(data.Stacks) && data.Stacks.length)) {
      // This means that the stack ARN or name we passed didn't appear in this Region.
      console.error('The ping came back, but CloudFormation showed no Stack.');
      console.error('Failing out with exit code 1.');
      process.exit(1);
    } else {

      // Read up within the CloudFormation aws-sdk in node.js if you want to 
      //   learn the format of the response objects.
      var stack = data.Stacks[0];
      var stackStatus = stack.StackStatus;

      // Using a simple ping counter to limit the length of time the process should wait.
      passedPings++;

      // Run variable logic based on what status we poll and get back.
      switch (stackStatus) {

        // These are positive, dynamic states. They mean "not done yet" and "no problems!"
        case 'CREATE_IN_PROGRESS':
        case 'UPDATE_IN_PROGRESS':
        case 'UPDATE_COMPLETE_CLEANUP_IN_PROGRESS':
          // Let the user know we are thinking still.
          console.log('Stack still processing: %s', stackStatus);
          // Then we should time out.
          if (passedPings >= PING_MAX_COUNT) {
            console.error('Stack exceeded max ping. Failing out with 1.');
            process.exit(1);
          } else {
            // Otherwise, we recurse the request after the interval passes.
            // Time in JS is mostly measured in milliseconds, which is why we need the * 1000.
            console.log('More pings allowed, %s of %s passed. Will ' +
              'ping again in %s seconds.', passedPings, PING_MAX_COUNT, PING_INTERVAL);
            return setTimeout(ping, PING_INTERVAL * 1000);
          }
          break;

        // These are the stable, positive end states. We should exit with 0 to let tests progress.
        case 'CREATE_COMPLETE':
        case 'UPDATE_COMPLETE':
          console.log('Stack stabilized: %s', stackStatus);
          console.log('Exiting with success!');
          process.exit(0);
          break;

        // These mean that something broke during creation.
        // They are either stable or dynamic states during or after breakage.
        case 'CREATE_FAILED':
        case 'ROLLBACK_IN_PROGRESS':
        case 'ROLLBACK_FAILED':
        case 'ROLLBACK_COMPLETE':
        case 'DELETE_IN_PROGRESS':
        case 'DELETE_FAILED':
        case 'DELETE_COMPLETE':
        case 'UPDATE_ROLLBACK_IN_PROGRESS':
        case 'UPDATE_ROLLBACK_FAILED':
        case 'UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS':
        case 'UPDATE_ROLLBACK_COMPLETE':
          console.error('Stack failure state: %s', stackStatus);
          console.error('Exiting with failure, exit code 1.');
          process.exit(1);
          break;

        // We should never hit this.
        default:
          console.error('FATAL: CloudFormation sent an ' +
            'unrecognized status! (%s)', stackStatus);
          console.error();
          process.exit(1);
          break; 
      }
    }
  });
}


// Helper funtion to get the command line --args as a hash.
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

function positiveInt(val) {
  var asString = val + '';
  return val.match(/^\d+$/) && +val;
}
