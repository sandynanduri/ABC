import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const ComingSoon = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      
      <div className="ml-64 flex flex-col min-h-screen">
        <DashboardHeader />
        <main className="flex-1 p-3 md:p-6 overflow-y-auto">
          <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
            <Card className="w-full max-w-2xl">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="rounded-full bg-primary/10 p-6">
                    <Shield className="h-16 w-16 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-3xl font-bold mb-2">DRR Analysis</CardTitle>
                <CardDescription className="text-lg">
                  Coming Soon
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Clock className="h-5 w-5" />
                  <p className="text-lg">
                    We're working hard to bring you comprehensive DRR (Data Regulatory Reporting) analysis features.
                  </p>
                </div>
                
                <div className="bg-muted/50 rounded-lg p-6 space-y-3 text-left">
                  <h3 className="font-semibold text-foreground">What to expect:</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Comprehensive DRR field mapping and validation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Gap analysis between CDM and DRR requirements</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Regulatory compliance reporting and tracking</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Automated validation of reportable fields</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4">
                  <Button 
                    onClick={() => navigate(-1)}
                    variant="outline"
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Go Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ComingSoon;

