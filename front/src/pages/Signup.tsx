/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { Input } from "../components/ui/Input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { registerUser } from "../api/auth";
import { setCredentials } from "../store/slices/authSlice"; 

// 1. تعريف شكل البيانات (Interfaces)
interface RegisterData {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: 'freelancer' | 'employer';
}

// 2. الـ Schema بتاعة الفحص (Zod)
const signupSchema = z
  .object({
    fullname: z.string().min(3, "Full name must be at least 3 characters"),
    email: z.string().min(1, "Email is required").email("Invalid email format"),
    phone: z
      .string()
      .min(1, "Phone number is required")
      .regex(/^01[0125][0-9]{8}$/, "Invalid Egyptian phone number"), 
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    role: z.enum(['freelancer', 'employer']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupFormInputs = z.infer<typeof signupSchema>;

export const Signup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormInputs>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: 'freelancer' 
    }
  });

  // 3. دالة الإرسال (تم تنظيف التكرار)
  const onSubmit = async (data: SignupFormInputs) => {
    setApiError(null);
    try {
      const payload: RegisterData = {
        fullName: data.fullname,
        email: data.email,
        phoneNumber: data.phone,
        password: data.password,
        role: data.role
      };

      // إرسال البيانات للباك إند
      const responseData = await registerUser(payload);

      // حفظ البيانات في Redux (عشان يبقى مسجل دخول)
      dispatch(setCredentials({ 
        user: responseData.user, 
        token: responseData.token 
      }));
      
      toast.success("Account created! Let's set up your profile.");

      // التوجيه لصفحة الـ Setup Profile (دائماً بعد التسجيل يكون البروفايل غير مكتمل)
      navigate("/setup-profile");

    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Registration failed. Please try again.";
      setApiError(errorMessage);
      toast.error(errorMessage);
      console.error("Signup Error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#171717] text-[#171717] dark:text-[#F5F5F5] transition-colors duration-300 font-sans">
      <header className="w-full py-4 px-6 shadow-sm bg-[#FFFFFF] dark:bg-[#262626] border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Link to="/login" className="hover:opacity-80 transition-opacity text-[#7C3AED] dark:text-[#8B5CF6]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </Link>
          <h1 className="text-xl font-bold">Sign Up</h1>
          <div className="w-6"></div>
        </div>
      </header>

      <main className="flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-[#FFFFFF] dark:bg-[#262626] rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-800">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Create Account</h2>
              <p className="text-gray-500 dark:text-gray-400">Join the Rabta community</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {apiError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium border border-red-200 dark:border-red-800 text-center">
                  {apiError}
                </div>
              )}

              <div className="flex flex-col gap-1.5 mb-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Register as:</label>
                <select
                  {...register("role")}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-[#FAFAFA] dark:bg-[#1f1f1f] px-4 py-3 text-sm text-[#171717] dark:text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] transition-all cursor-pointer"
                >
                  <option value="freelancer">Freelancer</option>
                  <option value="employer">Employer / Company</option>
                </select>
              </div>

              <Input label="Full Name" id="fullname" type="text" placeholder="Enter your full name" {...register("fullname")} error={errors.fullname?.message} />
              <Input label="Email" id="email" type="email" placeholder="example@mail.com" {...register("email")} error={errors.email?.message} />
              <Input label="Phone Number" id="phone" type="tel" placeholder="01xxxxxxxxx" {...register("phone")} error={errors.phone?.message} />
              <Input label="Password" id="password" type="password" placeholder="Min. 8 characters" {...register("password")} error={errors.password?.message} />
              <Input label="Confirm Password" id="confirm-password" type="password" placeholder="Confirm your password" {...register("confirmPassword")} error={errors.confirmPassword?.message} />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-6 py-3.5 px-4 rounded-xl font-bold text-white bg-[#7C3AED] dark:bg-[#8B5CF6] hover:bg-[#6D28D9] dark:hover:bg-[#7C3AED] shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center active:scale-[0.98]"
              >
                {isSubmitting ? "Creating Account..." : "Sign Up"}
              </button>
            </form>

            <div className="mt-8 text-center border-t border-gray-100 dark:border-gray-800 pt-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Already have an account?{" "}
                <Link to="/login" className="font-bold text-[#7C3AED] dark:text-[#8B5CF6] hover:underline">Log In</Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};