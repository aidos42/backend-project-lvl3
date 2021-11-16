const generateErrorMessage = (error) => {
  const { code, message, path } = error;

  return [
    'There was an error during execution',
    `Code: ${code}`,
    `Message: ${message}`,
    `Path: ${path}`,
  ].join('\n');
};

export default class ReadableError extends Error {
  constructor(error) {
    super(error);
    this.message = generateErrorMessage(error);
  }
}
