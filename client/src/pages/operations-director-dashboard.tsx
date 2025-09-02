ty === 'urgent' ? 'bg-red-50 text-red-700 border-red-200' :
                                request.priority === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                'bg-blue-50 text-blue-700 border-blue-200'
                              }
                            >
                              {request.priority?.toUpperCase() || 'NORMAL'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-2">
                            {request.budgetAmount && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                <strong>Budget:</strong> ${parseFloat(request.budgetAmount).toLocaleString()}
                              </p>
                            )}
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              <strong>Requested:</strong> {new Date(request.createdAt).toLocaleDateString()}
                            </p>
                            <div className="flex items-center justify-between pt-2">
                              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Needs Review
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {totalPendingApprovals === 0 && (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No pending approvals at this time.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Approval Details Dialog */}
        <Dialog open={showApprovalDetailsDialog} onOpenChange={setShowApprovalDetailsDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Approval Request Details</DialogTitle>
              <DialogDescription>
                Review the details of this approval request and choose an action.
              </DialogDescription>
            </DialogHeader>
            {selectedApprovalRequest && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type:</label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedApprovalRequest.type === 'user_deletion' && 'User Deletion Request'}
                    {selectedApprovalRequest.type === 'high_budget_work_order' && 'High Budget Work Order'}
                    {selectedApprovalRequest.type === 'high_budget_project' && 'High Budget Project'}
                    {selectedApprovalRequest.type === 'issue_escalation' && 'Issue Escalation'}
                  </p>
                </div>
                
                {selectedApprovalRequest.budgetAmount && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Budget Amount:</label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      ${parseFloat(selectedApprovalRequest.budgetAmount).toLocaleString()}
                    </p>
                  </div>
                )}
                
                {selectedApprovalRequest.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes:</label>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedApprovalRequest.notes}</p>
                  </div>
                )}
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowApprovalDetailsDialog(false)}
                    data-testid="button-cancel-approval"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => {
                      // Handle deny logic
                      setShowApprovalDetailsDialog(false);
                    }}
                    data-testid="button-deny-approval"
                  >
                    Deny
                  </Button>
                  <Button
                    onClick={() => {
                      // Handle approve logic
                      setShowApprovalDetailsDialog(false);
                    }}
                    data-testid="button-approve-approval"
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                    onClick={() => {
                      // Handle intervene logic
                      setShowApprovalDetailsDialog(false);
                    }}
                    data-testid="button-intervene-approval"
                  >
                    Intervene
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Recent Setups Dialog */}
        <Dialog open={showRecentSetupsDialog} onOpenChange={setShowRecentSetupsDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <UserPlus className="h-5 w-5 mr-2 text-orange-600 dark:text-orange-400" />
                Recent User Setups
              </DialogTitle>
              <DialogDescription>
                Displaying the 5 most recently created users
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {recentUsers.slice(0, 5).map((user: any, index: number) => (
                <Card key={user.id} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.firstName} {user.lastName}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {user.roles?.map((role: string) => (
                              <Badge key={role} variant="secondary" className="text-xs">
                                {role.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {user.companyName || 'No Company'}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {recentUsers.length === 0 && (
                <div className="text-center py-8">
                  <UserPlus className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No recent user setups found</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* User Creation Dialog - Using centralized UserOnboardingForm */}
        {showUserCreationDialog && selectedAccessRequest && (
          <UserOnboardingForm
            onClose={() => {
              setShowUserCreationDialog(false);
              setSelectedAccessRequest(null);
            }}
            onSuccess={() => {
              setShowUserCreationDialog(false);
              setSelectedAccessRequest(null);
              queryClient.invalidateQueries({ queryKey: ['/api/access-requests'] });
              toast({
                title: "User Created",
                description: "User account has been successfully created from the access request.",
              });
            }}
            currentUser={currentUser}
            preFilledData={{
              firstName: selectedAccessRequest.firstName,
              lastName: selectedAccessRequest.lastName,
              email: selectedAccessRequest.email,
              phone: selectedAccessRequest.phone || "",
              requestedRole: selectedAccessRequest.requestedRole,
            }}
          />
        )}
        </div>
      </StashLayout>
    </>
  );
}