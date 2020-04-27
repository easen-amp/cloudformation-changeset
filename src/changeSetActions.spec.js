const { join } = require('path');
const { readFileSync } = require('fs');

const generatePromiseObject = (result) => {
  return {
    promise: jest.fn().mockImplementation(() => result || {}),
  };
};

const mockCloudFormation = {
  createChangeSet: jest.fn().mockImplementation(() => generatePromiseObject({ id: 'ID' })),
  executeChangeSet: jest.fn().mockImplementation(() => generatePromiseObject()),
  deleteChangeSet: jest.fn().mockImplementation(() => generatePromiseObject()),
};

jest.mock('aws-sdk', () => {
  return {
    CloudFormation: jest.fn().mockImplementation(() => mockCloudFormation),
  };
});

const { createChangeSet, deleteChangeSet, executeChangeSet } = require('./changeSetActions');

describe('changeSetActions', function () {
  const STACK_NAME = 'cfn-deploy-changeset-action-test-stack';

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', function () {
    it('should return changeset id and name', async function () {
      const templateFile = join(__dirname, '__fixtures__', 'template.yml');
      const inputs = {
        awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
        awsRegion: 'eu-west-1',
        awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        stackName: STACK_NAME,
        templateFile: templateFile,
      };

      const response = await createChangeSet(inputs);

      expect(mockCloudFormation.createChangeSet).toHaveBeenCalledWith({
        Capabilities: ['CAPABILITY_IAM'],
        ChangeSetName: expect.any(String),
        ChangeSetType: 'CREATE',
        Parameters: [],
        StackName: 'cfn-deploy-changeset-action-test-stack',
        TemplateBody: await readFileSync(templateFile).toString(),
      });
      expect(response.id).not.toBeNull();
      expect(response.name).not.toBeNull();
    });
  });

  describe('execute', function () {
    it('should execute change set', async function () {
      const inputs = {
        awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
        awsRegion: 'eu-west-1',
        awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        stackName: STACK_NAME,
        changeSetName: 'cfn-deploy-changeset-action-test-stack-cf55040b-7cd0-40be-9fad-2a295463e6d5',
      };

      await executeChangeSet(inputs);
      expect(mockCloudFormation.executeChangeSet).toHaveBeenCalledWith({
        ChangeSetName: 'cfn-deploy-changeset-action-test-stack-cf55040b-7cd0-40be-9fad-2a295463e6d5',
        StackName: 'cfn-deploy-changeset-action-test-stack',
      });
    });
  });

  describe('delete', function () {
    it('should delete change set', async function () {
      const inputs = {
        awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
        awsRegion: 'eu-west-1',
        awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        stackName: STACK_NAME,
        changeSetName: 'cfn-deploy-changeset-action-test-stack-cf55040b-7cd0-40be-9fad-2a295463e6d5',
      };

      await deleteChangeSet(inputs);
      expect(mockCloudFormation.deleteChangeSet).toHaveBeenCalledWith({
        ChangeSetName: 'cfn-deploy-changeset-action-test-stack-cf55040b-7cd0-40be-9fad-2a295463e6d5',
        StackName: 'cfn-deploy-changeset-action-test-stack',
      });
    });
  });
});
