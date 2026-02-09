import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';

export default function GoogleLoginButton({ onSuccess, text = "Continue with Google" }) {
  const handleSuccess = (credentialResponse) => {
    const token = credentialResponse.credential;
    onSuccess(token);
  };

  const handleError = () => {
    toast.error('Google login failed. Please try again.');
  };

  return (
    <div className="w-full">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        text={text}
        size="large"
        width="100%"
        theme="filled_blue"
        shape="rectangular"
      />
    </div>
  );
}