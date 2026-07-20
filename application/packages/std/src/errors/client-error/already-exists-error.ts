import ClientError from './client-error'

export default class AlreadyExistsError extends ClientError {
  constructor(message: string) {
    super(message, 409)
    this.name = 'AlreadyExistsError'
  }
}
