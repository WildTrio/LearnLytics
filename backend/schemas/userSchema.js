const z=require("zod");
const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .regex(/^[a-zA-Z0-9]+$/, "Password must be alphanumeric")
});
const signinSchema=z.object({
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .regex(/^[a-zA-Z0-9]+$/, "Password must be alphanumeric")
})
const updateSchema=z.object({
  name:z.string().min(1,"Name is required"),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .regex(/^[a-zA-Z0-9]+$/, "Password must be alphanumeric")
})
const assignmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  subject: z.string().optional(),
  due_date: z.string().datetime(), // frontend must send ISO date string
});
module.exports={signupSchema,signinSchema,updateSchema,assignmentSchema};