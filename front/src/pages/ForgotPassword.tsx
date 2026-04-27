import React from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Input } from "../components/ui/Input";

const forgotSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email format"),
});

type ForgotFormInputs = z.infer<typeof forgotSchema>;

export const ForgotPassword = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormInputs>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = (data: ForgotFormInputs) => {
    console.log("Reset email sent to:", data.email);
    toast.success("Reset link sent successfully!");
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#171717] text-[#171717] dark:text-[#F5F5F5] transition-colors duration-300">
      <header className="w-full py-4 px-6 shadow-sm bg-[#FFFFFF] dark:bg-[#262626] transition-colors duration-300">
        <div className="flex items-center justify-between">
          <Link
            to="/login"
            className="hover:opacity-80 transition-opacity text-[#7C3AED] dark:text-[#8B5CF6]"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              ></path>
            </svg>
          </Link>
          <h1 className="text-xl font-bold tracking-tight">Forgot Password</h1>
          <div className="w-6"></div>
        </div>
      </header>

      <main className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-[#FFFFFF] dark:bg-[#262626] rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-800 transition-colors duration-300">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-[#7C3AED]/10 dark:bg-[#8B5CF6]/10 text-[#7C3AED] dark:text-[#8B5CF6]">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  ></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2">Reset Password</h2>
              <p className="text-gray-500 dark:text-gray-400">
                Enter your email and we'll send you a reset link
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <Input
                label="Email Address"
                id="email"
                type="email"
                placeholder="Enter your registered email"
                {...register("email")}
                error={errors.email?.message}
              />
              <div className="rounded-lg p-4 bg-[#7C3AED]/5 dark:bg-[#8B5CF6]/5 border border-[#7C3AED]/20 dark:border-[#8B5CF6]/20">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  We'll send a password reset link to your email. Please check
                  your inbox and spam folder.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-lg font-bold text-white bg-[#7C3AED] dark:bg-[#8B5CF6] hover:opacity-90 shadow-md transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Sending..." : "Send Reset Link"}
              </button>
            </form>

            <div className="mt-6 text-center space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Remember your password?{" "}
                <Link
                  to="/login"
                  className="font-bold text-[#7C3AED] dark:text-[#8B5CF6] hover:underline"
                >
                  Log In
                </Link>
              </p>
              <p className="text-xs text-gray-400">
                Need help?{" "}
                <a href="#" className="underline hover:text-[#7C3AED]">
                  Contact Support
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
