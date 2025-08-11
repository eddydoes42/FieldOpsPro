import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MapPin, Phone, Mail, User, Building, Home, ArrowLeft } from 'lucide-react';
import { RatingDisplay } from './rating-system';
import { Link } from 'wouter';

interface FieldAgent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  city?: string;
  state?: string;
  roles: string[];
  overallRating?: number;
  totalRatings?: number;
  communicationRating?: number;
  timelinessRating?: number;
  workSatisfactionRating?: number;
  companyName?: string;
  companyId?: string;
  companyType?: string;
}

interface Company {
  id: string;
  name: string;
  type: string;
  overallRating?: number;
  totalRatings?: number;
  fieldAgents: FieldAgent[];
}

function getUserIconColor(rating?: number): string {
  if (!rating || rating === 0) return 'bg-gray-400';
  if (rating >= 4.5) return 'bg-green-500';
  if (rating >= 4.0) return 'bg-blue-500';
  if (rating >= 3.5) return 'bg-yellow-500';
  if (rating >= 3.0) return 'bg-orange-500';
  return 'bg-red-500';
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

interface FieldAgentDetailModalProps {
  agent: FieldAgent | null;
  isOpen: boolean;
  onClose: () => void;
}

function FieldAgentDetailModal({ agent, isOpen, onClose }: FieldAgentDetailModalProps) {
  if (!agent) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <Avatar className={`h-12 w-12 ${getUserIconColor(agent.overallRating)}`}>
              <AvatarFallback className="text-white font-semibold">
                {getInitials(agent.firstName, agent.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-xl font-semibold">
                {agent.firstName} {agent.lastName}
              </div>
              <div className="text-sm text-gray-600 flex items-center space-x-2">
                <Building className="h-4 w-4" />
                <span>{agent.companyName}</span>
                <Badge variant="outline" className="ml-2">
                  {agent.companyType === 'service' ? 'Service Company' : 'Client Company'}
                </Badge>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Contact Information</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <Mail className="h-4 w-4 text-gray-500" />
                <span>{agent.email}</span>
              </div>
              {agent.phone && (
                <div className="flex items-center space-x-2 text-sm">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>{agent.phone}</span>
                </div>
              )}
              {(agent.city || agent.state) && (
                <div className="flex items-center space-x-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span>
                    {agent.city && agent.state ? `${agent.city}, ${agent.state}` : 
                     agent.city || agent.state}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Overall Rating */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Overall Performance</h3>
            <div className="flex items-center space-x-4">
              <RatingDisplay 
                rating={agent.overallRating || 0} 
                totalRatings={agent.totalRatings}
                size="lg"
              />
            </div>
          </div>

          {/* Detailed Ratings */}
          {(agent.communicationRating || agent.timelinessRating || agent.workSatisfactionRating) && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Performance Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {agent.communicationRating && (
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-600 mb-1">Communication</div>
                    <RatingDisplay rating={agent.communicationRating} showNumber={false} />
                    <div className="text-sm text-gray-500 mt-1">{agent.communicationRating.toFixed(1)}/5</div>
                  </div>
                )}
                {agent.timelinessRating && (
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-600 mb-1">Timeliness</div>
                    <RatingDisplay rating={agent.timelinessRating} showNumber={false} />
                    <div className="text-sm text-gray-500 mt-1">{agent.timelinessRating.toFixed(1)}/5</div>
                  </div>
                )}
                {agent.workSatisfactionRating && (
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-600 mb-1">Work Quality</div>
                    <RatingDisplay rating={agent.workSatisfactionRating} showNumber={false} />
                    <div className="text-sm text-gray-500 mt-1">{agent.workSatisfactionRating.toFixed(1)}/5</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Roles */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Roles</h3>
            <div className="flex flex-wrap gap-2">
              {agent.roles.map((role) => (
                <Badge key={role} variant="secondary">
                  {role.replace('_', ' ').toUpperCase()}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface CompanyCardProps {
  company: Company;
  onAgentClick: (agent: FieldAgent) => void;
}

function CompanyCard({ company, onAgentClick }: CompanyCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{company.name}</CardTitle>
          <Badge variant={company.type === 'service' ? 'default' : 'secondary'}>
            {company.type === 'service' ? 'Service Company' : 'Client Company'}
          </Badge>
        </div>
        {company.overallRating && (
          <div className="flex items-center space-x-2">
            <RatingDisplay 
              rating={company.overallRating} 
              totalRatings={company.totalRatings}
              size="sm"
            />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">
            Field Agents ({company.fieldAgents.length})
          </div>
          
          {company.fieldAgents.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {company.fieldAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => onAgentClick(agent)}
                  className="p-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center space-x-2">
                    <Avatar className={`h-8 w-8 ${getUserIconColor(agent.overallRating)}`}>
                      <AvatarFallback className="text-white text-xs font-semibold">
                        {getInitials(agent.firstName, agent.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {agent.firstName} {agent.lastName}
                      </div>
                      {agent.overallRating && (
                        <RatingDisplay 
                          rating={agent.overallRating} 
                          size="sm" 
                          showNumber={false}
                        />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic">
              No field agents available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function TalentNetworkPage() {
  const [selectedAgent, setSelectedAgent] = useState<FieldAgent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: fieldAgents = [], isLoading, error } = useQuery({
    queryKey: ['/api/users/field-agents'],
    queryFn: () => fetch('/api/users/field-agents').then(res => res.json()),
  });

  // Group field agents by company
  const companiesWithAgents: Company[] = fieldAgents.reduce((acc: Company[], agent: FieldAgent) => {
    const existingCompany = acc.find(c => c.id === agent.companyId);
    
    if (existingCompany) {
      existingCompany.fieldAgents.push(agent);
    } else {
      acc.push({
        id: agent.companyId || 'unknown',
        name: agent.companyName || 'Unknown Company',
        type: agent.companyType || 'service',
        fieldAgents: [agent],
      });
    }
    
    return acc;
  }, []);

  const handleAgentClick = (agent: FieldAgent) => {
    setSelectedAgent(agent);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAgent(null);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-lg">Loading talent network...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-lg text-red-600">Failed to load talent network</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="flex items-center space-x-2">
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Talent Network</h1>
            <p className="text-gray-600 mt-1">
              Discover field agents from service companies across the network
            </p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-semibold mb-2">Rating Legend</h3>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>4.5+ Stars (Excellent)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>4.0+ Stars (Very Good)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>3.5+ Stars (Good)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>3.0+ Stars (Fair)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Below 3.0 (Needs Improvement)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            <span>No Ratings Yet</span>
          </div>
        </div>
      </div>

      {/* Company Cards */}
      {companiesWithAgents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companiesWithAgents.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              onAgentClick={handleAgentClick}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <div className="text-lg text-gray-600">No field agents found</div>
          <div className="text-sm text-gray-500 mt-1">
            Field agents will appear here once they're added to the system
          </div>
        </div>
      )}

      {/* Agent Detail Modal */}
      <FieldAgentDetailModal
        agent={selectedAgent}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}