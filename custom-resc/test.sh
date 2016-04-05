
# Setting the script to error out and stop if any single statement exits non-0.
set -e;

# Then we can do something like:
#     $ ./example.sh TestStack us-west-2;
STACK=$1;
DB_STACK="$STACK"'-DB';
API_STACK="$STACK"'-API';
# This is a standard Bash trick to get the directory the script is running in.
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )";

# Standard AWS CLI command to create a stack. Adjust this to fit your use case.
aws --region us-west-2 --profile andrew-admin cloudformation create-stack \
  --stack-name "$DB_STACK" \
  --template-body fileb://"$DIR"/db.json \
  --capabilities 'CAPABILITY_IAM';

# This is the wait function that uses the poll-based method to detect stack completion.
node "$DIR"/../cfn-wait/index.js --stack "$DB_STACK" --interval 15 --max 40;

# Now run the implicity dependent stack that uses a custom resource to refer to the other stack.
aws --region us-west-2 --profile andrew-admin cloudformation create-stack \
  --stack-name "$API_STACK" \
  --parameters 'ParameterKey=DBStackName,ParameterValue='"$DB_STACK" \
  --template-body fileb://"$DIR"/api.json \
  --capabilities 'CAPABILITY_IAM';

node "$DIR"/../cfn-wait/index.js --stack "$API_STACK" --interval 15 --max 40;

node "$DIR"/../cfn-wait/example/test.js --stack "$API_STACK";
