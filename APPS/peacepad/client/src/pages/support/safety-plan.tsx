import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, Phone, MapPin, FileText, CreditCard, Pill, Baby, ArrowRight, ArrowLeft, Save, Trash2, Plus, X, Check } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
  isSafe: boolean;
}

interface SafePlace {
  name: string;
  address: string;
  phone: string;
  notes: string;
}

export default function SafetyPlanPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);

  // Form state
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [safePlaces, setSafePlaces] = useState<SafePlace[]>([]);
  const [importantDocuments, setImportantDocuments] = useState("");
  const [financialResources, setFinancialResources] = useState("");
  const [medications, setMedications] = useState("");
  const [childrenNeeds, setChildrenNeeds] = useState("");
  const [escapeRoute, setEscapeRoute] = useState("");
  const [codeWords, setCodeWords] = useState("");
  const [workSafety, setWorkSafety] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  // Fetch existing safety plan
  const { data: existingPlan, isLoading } = useQuery<any>({
    queryKey: ["/api/safety-plan"],
    enabled: !!user,
    retry: false,
  });

  // Load existing plan data when it becomes available
  useEffect(() => {
    if (existingPlan) {
      setEmergencyContacts(existingPlan.emergencyContacts || []);
      setSafePlaces(existingPlan.safePlaces || []);
      setImportantDocuments(existingPlan.importantDocuments || "");
      setFinancialResources(existingPlan.financialResources || "");
      setMedications(existingPlan.medications || "");
      setChildrenNeeds(existingPlan.childrenNeeds || "");
      setEscapeRoute(existingPlan.escapeRoute || "");
      setCodeWords(existingPlan.codeWords || "");
      setWorkSafety(existingPlan.workSafety || "");
      setAdditionalNotes(existingPlan.additionalNotes || "");
    }
  }, [existingPlan]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const planData = {
        emergencyContacts,
        safePlaces,
        importantDocuments,
        financialResources,
        medications,
        childrenNeeds,
        escapeRoute,
        codeWords,
        workSafety,
        additionalNotes,
      };

      if (existingPlan) {
        return apiRequest("/api/safety-plan", "PUT", planData);
      } else {
        return apiRequest("/api/safety-plan", "POST", planData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/safety-plan"] });
      toast({
        title: "Safety plan saved",
        description: "Your safety plan has been securely saved.",
        duration: 4000,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save",
        description: error.message || "Could not save your safety plan",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const steps = [
    {
      title: "Emergency Contacts",
      icon: Phone,
      description: "People you can call in an emergency",
    },
    {
      title: "Safe Places",
      icon: MapPin,
      description: "Places you can go if you need to leave quickly",
    },
    {
      title: "Important Documents",
      icon: FileText,
      description: "Documents to bring with you",
    },
    {
      title: "Financial Resources",
      icon: CreditCard,
      description: "Money, bank accounts, and cards",
    },
    {
      title: "Health & Children",
      icon: Baby,
      description: "Medications and children's needs",
    },
    {
      title: "Safety Strategies",
      icon: Shield,
      description: "Escape routes, code words, and workplace safety",
    },
  ];

  const addEmergencyContact = () => {
    setEmergencyContacts([...emergencyContacts, { name: "", phone: "", relationship: "", isSafe: true }]);
  };

  const removeEmergencyContact = (index: number) => {
    setEmergencyContacts(emergencyContacts.filter((_, i) => i !== index));
  };

  const updateEmergencyContact = (index: number, field: keyof EmergencyContact, value: any) => {
    const updated = [...emergencyContacts];
    updated[index] = { ...updated[index], [field]: value };
    setEmergencyContacts(updated);
  };

  const addSafePlace = () => {
    setSafePlaces([...safePlaces, { name: "", address: "", phone: "", notes: "" }]);
  };

  const removeSafePlace = (index: number) => {
    setSafePlaces(safePlaces.filter((_, i) => i !== index));
  };

  const updateSafePlace = (index: number, field: keyof SafePlace, value: string) => {
    const updated = [...safePlaces];
    updated[index] = { ...updated[index], [field]: value };
    setSafePlaces(updated);
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Loading safety plan...</p>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Safety Plan - PeacePad"
        description="Create a personalized safety plan with emergency contacts, safe places, and escape strategies."
        canonical={(import.meta.env.VITE_BASE_URL || window.location.origin) + '/support/safety-plan'}
      />
      <div className="h-full overflow-y-auto p-6 space-y-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2" data-testid="text-safety-plan-title">
              <Shield className="h-8 w-8 text-primary" />
              Safety Plan
            </h1>
            <p className="text-muted-foreground mt-1">
              Create a personalized safety plan to help protect yourself and your loved ones
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-4">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === index;
                const isCompleted = currentStep > index;

                return (
                  <div key={index} className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setCurrentStep(index)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                        isActive ? "bg-primary/10" : "hover:bg-muted"
                      }`}
                      data-testid={`step-${index}`}
                    >
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          isCompleted
                            ? "bg-green-500 text-white"
                            : isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                      </div>
                      <span className="text-xs text-center max-w-[80px] hidden sm:block">{step.title}</span>
                    </button>
                    {index < steps.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {(() => {
                  const Icon = steps[currentStep].icon;
                  return <Icon className="h-5 w-5" />;
                })()}
                {steps[currentStep].title}
              </CardTitle>
              <CardDescription>{steps[currentStep].description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentStep === 0 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    List people you can contact in an emergency. Include friends, family, or professionals who can help.
                  </p>
                  {emergencyContacts.map((contact, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">Contact {index + 1}</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeEmergencyContact(index)}
                            data-testid={`remove-contact-${index}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Input
                            placeholder="Name"
                            value={contact.name}
                            onChange={(e) => updateEmergencyContact(index, "name", e.target.value)}
                            data-testid={`input-contact-name-${index}`}
                          />
                          <Input
                            placeholder="Phone number"
                            value={contact.phone}
                            onChange={(e) => updateEmergencyContact(index, "phone", e.target.value)}
                            data-testid={`input-contact-phone-${index}`}
                          />
                          <Input
                            placeholder="Relationship (e.g., friend, sister)"
                            value={contact.relationship}
                            onChange={(e) => updateEmergencyContact(index, "relationship", e.target.value)}
                            data-testid={`input-contact-relationship-${index}`}
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`safe-${index}`}
                              checked={contact.isSafe}
                              onChange={(e) => updateEmergencyContact(index, "isSafe", e.target.checked)}
                              className="h-4 w-4"
                              data-testid={`checkbox-contact-safe-${index}`}
                            />
                            <label htmlFor={`safe-${index}`} className="text-sm">
                              Safe person (won't tell your location)
                            </label>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  <Button onClick={addEmergencyContact} variant="outline" className="w-full" data-testid="button-add-contact">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Emergency Contact
                  </Button>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Identify safe places you can go if you need to leave quickly. Include shelters, friends' homes, or public places.
                  </p>
                  {safePlaces.map((place, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">Safe Place {index + 1}</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSafePlace(index)}
                            data-testid={`remove-place-${index}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-3">
                          <Input
                            placeholder="Place name (e.g., Sister's house, Local shelter)"
                            value={place.name}
                            onChange={(e) => updateSafePlace(index, "name", e.target.value)}
                            data-testid={`input-place-name-${index}`}
                          />
                          <Input
                            placeholder="Address"
                            value={place.address}
                            onChange={(e) => updateSafePlace(index, "address", e.target.value)}
                            data-testid={`input-place-address-${index}`}
                          />
                          <Input
                            placeholder="Phone number"
                            value={place.phone}
                            onChange={(e) => updateSafePlace(index, "phone", e.target.value)}
                            data-testid={`input-place-phone-${index}`}
                          />
                          <Textarea
                            placeholder="Notes (e.g., Available 24/7, Has guest room)"
                            value={place.notes}
                            onChange={(e) => updateSafePlace(index, "notes", e.target.value)}
                            data-testid={`textarea-place-notes-${index}`}
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                  <Button onClick={addSafePlace} variant="outline" className="w-full" data-testid="button-add-place">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Safe Place
                  </Button>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    List important documents you should bring if you need to leave. Keep copies in a safe place.
                  </p>
                  <Textarea
                    placeholder="Examples:
• Birth certificates
• Social insurance/security cards  
• Passports
• Driver's license
• Bank statements
• Lease/mortgage documents
• Protection orders
• Medical records
• Insurance papers"
                    value={importantDocuments}
                    onChange={(e) => setImportantDocuments(e.target.value)}
                    className="min-h-[300px]"
                    data-testid="textarea-documents"
                  />
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Record financial resources you have access to. Never share account numbers here.
                  </p>
                  <Textarea
                    placeholder="Examples:
• Hidden emergency cash location
• Bank account information (names only, not numbers)
• Credit cards you have access to
• Emergency fund amount
• Important financial contacts
• Location of financial documents"
                    value={financialResources}
                    onChange={(e) => setFinancialResources(e.target.value)}
                    className="min-h-[250px]"
                    data-testid="textarea-financial"
                  />
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Medications to Bring</label>
                    <p className="text-sm text-muted-foreground">
                      List important medications for you and your children. Include prescriptions and over-the-counter items.
                    </p>
                    <Textarea
                      placeholder="Examples:
• Daily prescriptions
• Emergency medications (inhalers, EpiPens)
• Children's medications
• First aid supplies"
                      value={medications}
                      onChange={(e) => setMedications(e.target.value)}
                      className="min-h-[150px]"
                      data-testid="textarea-medications"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium">Children's Needs</label>
                    <p className="text-sm text-muted-foreground">
                      Items and information for your children's safety and comfort.
                    </p>
                    <Textarea
                      placeholder="Examples:
• Favorite toy or comfort item
• Extra clothes
• School records
• Childcare contacts
• Pediatrician information
• Special dietary needs"
                      value={childrenNeeds}
                      onChange={(e) => setChildrenNeeds(e.target.value)}
                      className="min-h-[150px]"
                      data-testid="textarea-children"
                    />
                  </div>
                </div>
              )}

              {currentStep === 5 && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Escape Route</label>
                    <p className="text-sm text-muted-foreground">
                      Plan the safest way to leave your home quickly. Identify exits and practice if possible.
                    </p>
                    <Textarea
                      placeholder="Examples:
• Which door/window to use
• Where to park your car
• Escape route from each room
• Items to grab on the way out
• Where to go first"
                      value={escapeRoute}
                      onChange={(e) => setEscapeRoute(e.target.value)}
                      className="min-h-[150px]"
                      data-testid="textarea-escape"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium">Code Words</label>
                    <p className="text-sm text-muted-foreground">
                      Secret words or phrases to signal danger to trusted people without alerting your abuser.
                    </p>
                    <Textarea
                      placeholder="Examples:
• Code word to tell kids to go to safe place
• Code phrase for friends to call police
• Safe response vs. danger response"
                      value={codeWords}
                      onChange={(e) => setCodeWords(e.target.value)}
                      className="min-h-[120px]"
                      data-testid="textarea-codewords"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium">Workplace Safety</label>
                    <p className="text-sm text-muted-foreground">
                      Strategies to stay safe at work. Inform trusted colleagues or security if needed.
                    </p>
                    <Textarea
                      placeholder="Examples:
• Who at work knows about the situation
• Security/HR contact information
• Safe parking location
• Alternate routes to work
• Photo of abuser for security"
                      value={workSafety}
                      onChange={(e) => setWorkSafety(e.target.value)}
                      className="min-h-[150px]"
                      data-testid="textarea-work-safety"
                    />
                  </div>
                </div>
              )}

              {currentStep === 5 && (
                <div className="space-y-3 mt-4">
                  <label className="text-sm font-medium">Additional Notes</label>
                  <Textarea
                    placeholder="Any other important information for your safety plan..."
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    className="min-h-[100px]"
                    data-testid="textarea-additional"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              data-testid="button-previous"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleSave}
                variant="outline"
                disabled={saveMutation.isPending}
                data-testid="button-save"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Progress
              </Button>

              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                  data-testid="button-next"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  data-testid="button-complete"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {saveMutation.isPending ? "Saving..." : "Complete Plan"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
