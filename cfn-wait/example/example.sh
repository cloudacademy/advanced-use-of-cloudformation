
# Setting the script to error out and stop if any single statement exits non-0.
set -e;

# Then we can do something like:
#     $ ./example.sh TestStack us-west-2;
STACK=$1;
export AWS_REGION=$2;

# This is a standard Bash trick to get the directory the script is running in.
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )";

# Standard AWS CLI command to create a stack. Adjust this to fit your use case.
aws --region us-west-2 --profile andrew-admin cloudformation create-stack \
  --stack-name "$STACK" \
  --template-body fileb://"$DIR"/example.template \
  --capabilities 'CAPABILITY_IAM';

# This is the wait function that uses the poll-based method to detect stack completion.
node "$DIR"/../index.js --stack "$STACK" --interval 15 --max 20;

# Finally, we can run any kind of testing script we want after the stack creates.
node "$DIR"/test.js --stack "$STACK";
