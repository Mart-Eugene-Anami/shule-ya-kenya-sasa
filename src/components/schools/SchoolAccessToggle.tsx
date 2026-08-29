import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Lock, Unlock, Loader2 } from "lucide-react";
import { toggleSchoolAccess, formatKES } from "@/services/accessControlService";
import type { SchoolAccessInfo } from "@/services/accessControlService";

interface SchoolAccessToggleProps {
  school: SchoolAccessInfo;
  onAccessChanged: () => void;
}

export const SchoolAccessToggle = ({ school, onAccessChanged }: SchoolAccessToggleProps) => {
  const { toast } = useToast();
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleAccess = async () => {
    setIsToggling(true);
    try {
      const newStatus = school.access_status === 'allowed' ? 'restricted' : 'allowed';
      await toggleSchoolAccess(school.id, newStatus);
      
      toast({
        title: newStatus === 'allowed' ? "Access Granted" : "Access Restricted",
        description: `${school.name} has been ${newStatus === 'allowed' ? 'granted access' : 'restricted'}`
      });
      
      onAccessChanged();
    } catch (error: any) {
      console.error('Error toggling access:', error);
      toast({
        title: "Failed to update access",
        description: error.message || "Could not update school access status",
        variant: "destructive"
      });
    } finally {
      setIsToggling(false);
    }
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'tier_1':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'tier_2':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'tier_3':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'tier_4':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Pricing Info */}
      <div className="text-right text-sm">
        <div className="flex items-center gap-2 justify-end">
          <Badge className={getTierBadgeColor(school.pricing_tier)}>
            {school.student_count} students
          </Badge>
        </div>
        <p className="text-muted-foreground text-xs mt-1">
          {school.requires_consultation 
            ? 'Contact for quote' 
            : formatKES(school.termly_cost) + '/term'
          }
        </p>
      </div>

      {/* Access Status Badge */}
      <Badge 
        variant={school.access_status === 'allowed' ? 'default' : 'destructive'}
        className="min-w-[90px] justify-center"
      >
        {school.access_status === 'allowed' ? (
          <>
            <Unlock className="h-3 w-3 mr-1" />
            Allowed
          </>
        ) : (
          <>
            <Lock className="h-3 w-3 mr-1" />
            Restricted
          </>
        )}
      </Badge>

      {/* Toggle Button */}
      <Button
        variant={school.access_status === 'allowed' ? 'outline' : 'default'}
        size="sm"
        onClick={handleToggleAccess}
        disabled={isToggling}
        className="min-w-[100px]"
      >
        {isToggling ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : school.access_status === 'allowed' ? (
          <>
            <Lock className="h-4 w-4 mr-1" />
            Restrict
          </>
        ) : (
          <>
            <Unlock className="h-4 w-4 mr-1" />
            Allow
          </>
        )}
      </Button>
    </div>
  );
};
