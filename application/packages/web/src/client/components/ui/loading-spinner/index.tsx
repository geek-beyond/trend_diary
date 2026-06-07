import SpinnerCircle3 from '../../customized/spinner/spinner-09'

export default function LoadingSpinner() {
  return (
    <div
      className='bg-opacity-75 fixed inset-0 flex items-center justify-center bg-gray-50 backdrop-blur-sm'
      role='status'
      aria-label='Loading...'
    >
      <SpinnerCircle3 />
    </div>
  )
}
