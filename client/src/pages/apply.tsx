import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Building2, UserPlus, CheckCircle, AlertCircle } from "lucide-react";

const applicationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  company: z.string().optional(),
  skills: z.array(z.string()).min(1, "Please select at least one skill"),
  motivation: z.string().min(50, "Please provide at least 50 characters explaining why you want to join"),
});

type ApplicationForm = z.infer<typeof applicationSchema>;

const AVAILABLE_SKILLS = [
  "Network Installation",
  "Hardware Setup",
  "Software Configuration",
  "Troubleshooting",
  "Cable Management",
  "WiFi Setup",
  "Security Systems",
  "Point of Sale (POS)",
  "VoIP Systems",
  "Server Maintenance",
  "Printer Installation",
  "Database Management",
  "Cloud Services",
  "Mobile Device Setup",
  "Audio/Video Systems"
];

export default function Apply() {
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<ApplicationForm>({
    resolver: zodResolver(applicationSchema),
  });

  const submitApplication = useMutation({
    mutationFn: async (data: ApplicationForm) => {
      return apiRequest("/api/onboarding-requests", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Application Submitted",
        description: "Thank you for your interest! We'll review your application and get back to you soon.",
      });
      reset();
      setSelectedSkills([]);
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "There was an error submitting your application. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSkillToggle = (skill: string) => {
    const updated = selectedSkills.includes(skill)
      ? selectedSkills.filter(s => s !== skill)
      : [...selectedSkills, skill];
    
    setSelectedSkills(updated);
    setValue("skills", updated);
  };

  const onSubmit = (data: ApplicationForm) => {
    submitApplication.mutate({
      ...data,
      skills: selectedSkills,
    });
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-green-600">Application Submitted!</CardTitle>
            <CardDescription>
              Thank you for your interest in joining FieldOps Pro. We'll review your application and contact you soon.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => setIsSubmitted(false)} variant="outline">
              Submit Another Application
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8 pt-8">
          <Building2 className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Join FieldOps Pro
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Apply to become a certified field operations professional
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Contractor Application
            </CardTitle>
            <CardDescription>
              Fill out this form to apply for access to our field operations platform.
              All applications are reviewed by our Operations team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" data-testid="label-name">Full Name *</Label>
                    <Input
                      id="name"
                      {...register("name")}
                      placeholder="John Smith"
                      data-testid="input-name"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email" data-testid="label-email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register("email")}
                      placeholder="john@example.com"
                      data-testid="input-email"
                    />
                    {errors.email && (
                      <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone" data-testid="label-phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      {...register("phone")}
                      placeholder="(555) 123-4567"
                      data-testid="input-phone"
                    />
                    {errors.phone && (
                      <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="company" data-testid="label-company">Company (Optional)</Label>
                    <Input
                      id="company"
                      {...register("company")}
                      placeholder="Tech Solutions LLC"
                      data-testid="input-company"
                    />
                  </div>
                </div>
              </div>

              {/* Skills & Certifications */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Skills & Certifications</h3>
                <div>
                  <Label data-testid="label-skills">Select Your Skills *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {AVAILABLE_SKILLS.map((skill) => (
                      <div key={skill} className="flex items-center space-x-2">
                        <Checkbox
                          id={skill}
                          checked={selectedSkills.includes(skill)}
                          onCheckedChange={() => handleSkillToggle(skill)}
                          data-testid={`checkbox-skill-${skill.replace(/\s+/g, '-').toLowerCase()}`}
                        />
                        <Label
                          htmlFor={skill}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {skill}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {errors.skills && (
                    <p className="text-sm text-red-600 mt-1">{errors.skills.message}</p>
                  )}
                </div>
              </div>

              {/* Motivation */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Tell Us About Yourself</h3>
                <div>
                  <Label htmlFor="motivation" data-testid="label-motivation">
                    Why do you want to join FieldOps Pro? *
                  </Label>
                  <Textarea
                    id="motivation"
                    {...register("motivation")}
                    placeholder="Please describe your experience, goals, and why you'd like to join our platform..."
                    className="min-h-[120px]"
                    data-testid="textarea-motivation"
                  />
                  {errors.motivation && (
                    <p className="text-sm text-red-600 mt-1">{errors.motivation.message}</p>
                  )}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      Application Review Process
                    </p>
                    <p className="text-blue-700 dark:text-blue-200">
                      All applications are carefully reviewed by our Operations Director. 
                      Only approved contractors will receive login credentials. 
                      We maintain high standards to ensure quality service delivery.
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={submitApplication.isPending}
                data-testid="button-submit-application"
              >
                {submitApplication.isPending ? "Submitting..." : "Submit Application"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-8 text-sm text-gray-600 dark:text-gray-400">
          <p>Already have an account? <a href="/login" className="text-blue-600 hover:underline">Sign in here</a></p>
        </div>
      </div>
    </div>
  );
}