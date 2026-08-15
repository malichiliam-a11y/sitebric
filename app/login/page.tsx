import LoginScreen from "@/app/components/login/LoginScreen";

// Same page as "/", opened on the sign-in card rather than the demo —
// someone who navigated here asked for the form, not the pitch.
export default function LoginPage() {
  return <LoginScreen initialPanel="auth" />;
}
