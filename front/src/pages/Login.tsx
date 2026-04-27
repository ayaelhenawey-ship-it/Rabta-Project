/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Input } from "../components/ui/Input";
import { loginUser } from "../api/auth";
import { setCredentials } from "../store/slices/authSlice";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email or phone is required")
    .email("Invalid email format"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

export const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormInputs) => {
    try {
      const responseData = await loginUser({
        email: data.email,
        password: data.password,
      });
      dispatch(setCredentials({ user: responseData.user, token: responseData.token }));
      toast.success("Successfully logged in!");
      
      // التوجيه بناءً على حالة البروفايل من الباك-إند
      if (responseData.profileComplete === false) {
        navigate("/setup-profile");
      } else {
        navigate("/chats");
      }
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Login failed. Please check your credentials.";
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#171717] text-[#171717] dark:text-[#F5F5F5] transition-colors duration-300">
      <header className="w-full py-4 px-6 shadow-sm bg-[#FFFFFF] dark:bg-[#262626] transition-colors duration-300">
        <div className="flex items-center justify-between">
          <Link to="/" className="hover:opacity-80 transition-opacity text-[#7C3AED] dark:text-[#8B5CF6]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </Link>
          <h1 className="text-xl font-bold tracking-tight">Log In</h1>
          <div className="w-6"></div>
        </div>
      </header>

      <main className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-[#FFFFFF] dark:bg-[#262626] rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-800 transition-colors duration-300">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Welcome Back</h2>
              <p className="text-gray-500 dark:text-gray-400">Enter your credentials to continue</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <Input
                label="Email"
                id="email"
                type="text"
                placeholder="Enter your email"
                {...register("email")}
                error={errors.email?.message}
              />

              <Input
                label="Password"
                id="password"
                type="password"
                placeholder="Enter your password"
                {...register("password")}
                error={errors.password?.message}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-lg font-bold text-white bg-[#7C3AED] dark:bg-[#8B5CF6] hover:opacity-90 shadow-md transition-all disabled:opacity-70 flex justify-center items-center"
              >
                {isSubmitting ? "Loading..." : "Log In"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Don't have an account?{" "}
                <Link to="/signup" className="font-bold text-[#7C3AED] dark:text-[#8B5CF6] hover:underline">
                  Sign Up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};