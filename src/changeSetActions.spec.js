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

jest.mock('uuid');

const uuid = require('uuid');
const { createChangeSet, deleteChangeSet, executeChangeSet } = require('./changeSetActions');

describe('changeSetActions', function () {
  const STACK_NAME = 'cfn-deploy-changeset-action-test-stack';

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', function () {
    const templateFile = join(__dirname, '__fixtures__', 'template.yml');
    const inputs = {
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      awsRegion: 'eu-west-1',
      awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      stackName: STACK_NAME,
      templateFile: templateFile,
      parameters: 'foo=123,bar=abc',
    };

    let expectedCreateChangeSetParam;
    beforeAll(async () => {
      expectedCreateChangeSetParam = {
        Capabilities: ['CAPABILITY_IAM'],
        ChangeSetName: expect.any(String),
        ChangeSetType: 'CREATE',
        Parameters: [
          {
            ParameterKey: 'foo',
            ParameterValue: '123',
          },
          {
            ParameterKey: 'bar',
            ParameterValue: 'abc',
          },
        ],
        StackName: 'cfn-deploy-changeset-action-test-stack',
        TemplateBody: await readFileSync(templateFile).toString(),
      };
    });

    it('should create a changeset using a uuid', async function () {
      const response = await createChangeSet(inputs);

      expect(mockCloudFormation.createChangeSet).toHaveBeenCalledWith(expectedCreateChangeSetParam);
      expect(uuid.v4).toHaveBeenCalled();
      expect(response.id).not.toBeNull();
      expect(response.name).not.toBeNull();
    });

    it('should throw an error when an invalid template is supplied', async function () {
      await expect(() => createChangeSet({ ...inputs, templateFile: 'invalid_file' })).rejects.toThrow();
    });

    it('should create a changeset using the supplied changeSetName', async function () {
      const changeSetName = 'custom-change-set-name';
      const response = await createChangeSet({ ...inputs, changeSetName });

      expect(mockCloudFormation.createChangeSet).toHaveBeenCalledWith({
        ...expectedCreateChangeSetParam,
        ChangeSetName: changeSetName,
      });
      expect(uuid.v4).not.toHaveBeenCalled();
      expect(response.id).not.toBeNull();
      expect(response.name).not.toBeNull();
    });

    it('should create a changeset using the supplied description', async function () {
      const description = 'custom-description';
      const response = await createChangeSet({ ...inputs, description });

      expect(mockCloudFormation.createChangeSet).toHaveBeenCalledWith({
        ...expectedCreateChangeSetParam,
        Description: description,
      });
      expect(uuid.v4).toHaveBeenCalled();
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
