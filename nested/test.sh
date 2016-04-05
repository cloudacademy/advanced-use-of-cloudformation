
# Setting the script to error out and stop if any single statement exits non-0.
set -e;

# Then we can do something like:
#     $ ./example.sh TestStack us-west-2;
STACK=$1;
export AWS_REGION=$2;
# This is a standard Bash trick to get the directory the script is running in.
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )";

aws --region us-west-2 s3 cp --recursive "$DIR"'/templates/' 's3://us-west-2.cfn-demos.templeton.host/nesteds/';

# Standard AWS CLI command to create a stack. Adjust this to fit your use case.
aws --region us-west-2 --profile andrew-admin cloudformation create-stack \
  --stack-name "$STACK" \
  --template-url 'https://s3-us-west-2.amazonaws.com/us-west-2.cfn-demos.templeton.host/nesteds/parent.json' \
  --capabilities 'CAPABILITY_IAM';

# This is the wait function that uses the poll-based method to detect stack completion.
node "$DIR"/../cfn-wait/index.js --stack "$STACK" --interval 15 --max 20;

# Finally, we can run any kind of testing script we want after the stack creates.
node "$DIR"/../cfn-wait/example/test.js --stack "$STACK";
