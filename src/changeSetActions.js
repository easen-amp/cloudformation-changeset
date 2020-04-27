const { existsSync, readFileSync } = require("fs");
const AWS = require("aws-sdk");
const uuid = require("uuid");

async function createChangeSet(inputs) {
  const {
    awsAccessKeyId,
    awsRegion,
    awsSecretAccessKey,
    parameters,
    stackName,
    templateFile,
    changeSetName,
    description
  } = inputs;

  if (existsSync(templateFile)) {
    const file = await readFileSync(templateFile);

    const cfn = new AWS.CloudFormation({
      accessKeyId: awsAccessKeyId,
      secretAccessKey: awsSecretAccessKey,
      region: awsRegion
    });

    const params = {
      Capabilities: ["CAPABILITY_IAM"],
      ChangeSetType: "CREATE",
      ChangeSetName: changeSetName || `${stackName}-${uuid.v4()}`,
      StackName: stackName,
      TemplateBody: file.toString(),
      Parameters: []
    };
    if (description) {
      params.Description = description;
    }

    if (parameters && parameters.trim() !== "") {
      const keyValues = parameters.split(",");

      keyValues.forEach(kv => {
        const values = kv.split("=");
        params.Parameters.push({
          ParameterKey: values[0],
          ParameterValue: values[1]
        });
      });
    }

    const { Id } = await cfn.createChangeSet(params).promise();

    return { id: Id, name: params.ChangeSetName };
  } else {
    throw new Error(`${templateFile} not found`);
  }
}

async function executeChangeSet(inputs) {
  const {
    awsAccessKeyId,
    awsRegion,
    awsSecretAccessKey,
    changeSetName,
    stackName
  } = inputs;

  const cfn = new AWS.CloudFormation({
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
    region: awsRegion
  });

  await cfn
    .executeChangeSet({ ChangeSetName: changeSetName, StackName: stackName })
    .promise();
}

async function deleteChangeSet(inputs) {
  const {
    awsAccessKeyId,
    awsRegion,
    awsSecretAccessKey,
    changeSetName,
    stackName
  } = inputs;

  const cfn = new AWS.CloudFormation({
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
    region: awsRegion
  });

  await cfn
    .deleteChangeSet({ ChangeSetName: changeSetName, StackName: stackName })
    .promise();
}

module.exports = {
  createChangeSet,
  deleteChangeSet,
  executeChangeSet
};
