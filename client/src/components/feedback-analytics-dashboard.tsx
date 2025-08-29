import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  Star, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  MessageSquare, 
  BarChart3,
  Calendar,
  Award,
  AlertTriangle
} from "lucide-react";

interface FeedbackAnalyticsDashboardProps {
  companyId?: string;
  agentId?: string;
  viewMode?: 'company' | 'agent';
}

export default function FeedbackAnalyticsDashboard({ 
  companyId, 
  agentId, 
  viewMode = 'company' 
}: FeedbackAnalyticsDashboardProps) {
  const [timeFrame, setTimeFrame] = useState('30');
  const [category, setCategory] = useState('all');

  // Fetch feedback analytics
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['/api/feedback/analytics', { companyId, agentId, timeFrame, category }],
    queryFn: async () => {
      const params = new URLSearchParams({
        timeFrame,
        category,
      });
      
      if (companyId) params.append('companyId', companyId);
      if (agentId) params.append('agentId', agentId);
      
      const response = await fetch(`/api/feedback/analytics?${params}`);
      if (!response.ok) throw new Error('Failed to fetch feedback analytics');
      return response.json();
    },
  });

  // Fetch feedback trends
  const { data: trends } = useQuery({
    queryKey: ['/api/feedback/trends', { companyId, agentId, timeFrame }],
    queryFn: async () => {
      const params = new URLSearchParams({ timeFrame });
      if (companyId) params.append('companyId', companyId);
      if (agentId) params.append('agentId', agentId);
      
      const response = await fetch(`/api/feedback/trends?${params}`);
      if (!response.ok) throw new Error('Failed to fetch feedback trends');
      return response.json();
    },
  });

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600 dark:text-green-400';
    if (rating >= 3.5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <BarChart3 className="w-4 h-4 text-gray-500" />;
  };

  const renderStarRating = (rating: number, size = 'sm') => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star 
            key={i} 
            className={`${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} fill-yellow-400 text-yellow-400`} 
          />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative">
            <Star className={`${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} text-gray-300`} />
            <Star 
              className={`${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} fill-yellow-400 text-yellow-400 absolute top-0 left-0`}
              style={{ clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' }}
            />
          </div>
        );
      } else {
        stars.push(
          <Star key={i} className={`${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} text-gray-300`} />
        );
      }
    }
    
    return <div className="flex items-center space-x-1">{stars}</div>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="feedback-analytics-dashboard">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {viewMode === 'company' ? 'Company' : 'Agent'} Feedback Analytics
        </h2>
        
        <div className="flex space-x-4">
          <Select value={timeFrame} onValueChange={setTimeFrame}>
            <SelectTrigger className="w-32" data-testid="select-timeframe">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 3 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40" data-testid="select-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="communication">Communication</SelectItem>
              <SelectItem value="timeliness">Timeliness</SelectItem>
              <SelectItem value="work_quality">Work Quality</SelectItem>
              <SelectItem value="management">Management</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card data-testid="card-overall-rating">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Rating</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className={`text-2xl font-bold ${getRatingColor(analytics?.overallRating || 0)}`}>
                {analytics?.overallRating?.toFixed(1) || '0.0'}
              </div>
              {renderStarRating(analytics?.overallRating || 0)}
            </div>
            <div className="flex items-center space-x-2 mt-2">
              {getTrendIcon(analytics?.ratingTrend || 0)}
              <p className="text-xs text-muted-foreground">
                {analytics?.ratingTrend > 0 ? '+' : ''}{analytics?.ratingTrend?.toFixed(1) || '0.0'}% from last period
              </p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-reviews">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalReviews || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.reviewsThisPeriod || 0} reviews this period
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-response-rate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.responseRate?.toFixed(1) || '0.0'}%
            </div>
            <Progress 
              value={analytics?.responseRate || 0} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card data-testid="card-satisfaction-score">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction Score</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {analytics?.satisfactionScore?.toFixed(1) || '0.0'}%
            </div>
            <p className="text-xs text-muted-foreground">
              % of 4+ star ratings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Ratings Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-category-breakdown">
          <CardHeader>
            <CardTitle>Rating Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.categoryBreakdown?.map((category: any) => (
                <div key={category.name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{category.name}</span>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${getRatingColor(category.rating)}`}>
                        {category.rating.toFixed(1)}
                      </span>
                      {renderStarRating(category.rating, 'sm')}
                    </div>
                  </div>
                  <Progress value={(category.rating / 5) * 100} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {category.count} reviews
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-rating-distribution">
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = analytics?.ratingDistribution?.[stars] || 0;
                const percentage = analytics?.totalReviews > 0 
                  ? (count / analytics.totalReviews) * 100 
                  : 0;
                
                return (
                  <div key={stars} className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1 w-16">
                      <span className="text-sm">{stars}</span>
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    </div>
                    <Progress value={percentage} className="flex-1 h-2" />
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Feedback */}
      <Card data-testid="card-recent-feedback">
        <CardHeader>
          <CardTitle>Recent Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics?.recentFeedback?.map((feedback: any) => (
              <div key={feedback.id} className="border-l-4 border-blue-500 pl-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2">
                    {renderStarRating(feedback.averageRating)}
                    <span className="text-sm text-muted-foreground">
                      {feedback.workOrderTitle}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {new Date(feedback.createdAt).toLocaleDateString()}
                  </Badge>
                </div>
                {feedback.comment && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    "{feedback.comment}"
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  by {feedback.clientName}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Items */}
      {analytics?.actionItems?.length > 0 && (
        <Card data-testid="card-action-items">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <span>Action Items</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.actionItems.map((item: any, index: number) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}