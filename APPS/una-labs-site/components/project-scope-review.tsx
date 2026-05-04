'use client';

/**
 * Unalabs Scope Review Component
 * Location: APPS/una-labs-site/components/project-scope-review.tsx
 * Purpose: Client reviews generated scope, provides feedback, and approves to move to Active
 */

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { createBrowserClient } from '@ftc/supabase';

interface Scope {
  phases: Array<{
    name: string;
    duration_weeks: number;
    objectives: string[];
    deliverables: string[];
    milestones: string[];
  }>;
  tech_stack: {
    frontend?: string[];
    backend?: string[];
    infrastructure?: string[];
    tools?: string[];
  };
  effort_estimates: {
    total_weeks: number;
    team_size: number;
    cost_estimate_usd: number;
  };
  risks: Array<{
    risk: string;
    likelihood: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
  assumptions: string[];
  mockup_descriptions: Array<{
    screen_name: string;
    description: string;
    user_flow: string;
  }>;
  timeline_breakdown: string;
  next_steps: string[];
}

interface ProjectArtifact {
  id: string;
  project_id: string;
  artifact_type: string;
  version: number;
  content: Scope;
  summary: string;
  generated_by: string;
  generated_at: string;
}

interface Project {
  id: string;
  project_name: string;
  email: string;
  workflow_status: string;
}

export default function ProjectScopeReview() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const supabase = createBrowserClient();

  const [project, setProject] = useState<Project | null>(null);
  const [artifact, setArtifact] = useState<ProjectArtifact | null>(null);
  const [scope, setScope] = useState<Scope | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'phases' | 'timeline' | 'risks' | 'mockups'
  >('overview');
  const [isChangesModalOpen, setIsChangesModalOpen] = useState(false);
  const [changeRequest, setChangeRequest] = useState('');
  const [isSubmittingChanges, setIsSubmittingChanges] = useState(false);
  const [changesSubmitted, setChangesSubmitted] = useState(false);
  const changeRequestRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!projectId) return;

    const fetchData = async () => {
      try {
        // Fetch project
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (projectError) throw projectError;
        setProject(projectData);

        // Fetch latest scope artifact
        const { data: artifactData, error: artifactError } = await supabase
          .from('project_artifacts')
          .select('*')
          .eq('project_id', projectId)
          .eq('artifact_type', 'scope_doc')
          .order('version', { ascending: false })
          .limit(1)
          .single();

        if (artifactError && artifactError.code !== 'PGRST116') {
          throw artifactError;
        }

        if (artifactData) {
          setArtifact(artifactData);
          setScope(artifactData.content);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load scope. Please try again.');
      }
    };

    fetchData();
  }, [projectId, supabase]);

  const handleApprove = async () => {
    if (!artifact || !project) return;

    setIsApproving(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/approve-project-scope`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${
              (await supabase.auth.getSession()).data.session?.access_token
            }`,
          },
          body: JSON.stringify({
            projectId,
            artifactId: artifact.id,
            approvedBy: project.email,
            notes: feedback || 'Approved',
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to approve scope');
      }

      // Refresh project status
      const { data: updatedProject } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      setProject(updatedProject);
    } catch (err) {
      console.error('Error approving scope:', err);
      setError('Failed to approve scope. Please try again.');
    } finally {
      setIsApproving(false);
    }
  };

  const openChangesModal = () => {
    setChangeRequest('');
    setChangesSubmitted(false);
    setIsChangesModalOpen(true);
    setTimeout(() => changeRequestRef.current?.focus(), 50);
  };

  const closeChangesModal = () => {
    setIsChangesModalOpen(false);
  };

  const handleSubmitChanges = async () => {
    if (!changeRequest.trim()) return;
    setIsSubmittingChanges(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setChangesSubmitted(true);
    } finally {
      setIsSubmittingChanges(false);
    }
  };

  if (!project || !scope) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">Loading scope...</p>
      </div>
    );
  }

  const isApproved =
    project.workflow_status === 'active' ||
    project.workflow_status === 'building' ||
    project.workflow_status === 'complete';

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {project.project_name} Scope
          </h1>
          <div className="flex items-center gap-4">
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                isApproved
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {isApproved ? '✓ Approved' : 'Awaiting Approval'}
            </span>
            <span className="text-sm text-gray-500">
              Version {artifact?.version}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <div className="flex gap-8">
            {(
              [
                'overview',
                'phases',
                'timeline',
                'risks',
                'mockups',
              ] as const
            ).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 px-2 border-b-2 font-medium capitalize ${
                  activeTab === tab
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="mb-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Total Duration</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {scope.effort_estimates.total_weeks} weeks
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Estimated Cost</p>
                  <p className="text-2xl font-bold text-green-900">
                    ${scope.effort_estimates.cost_estimate_usd.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Team Size</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {scope.effort_estimates.team_size} engineer(s)
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Key Assumptions
                </h3>
                <ul className="space-y-2">
                  {scope.assumptions.map((assumption, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="text-purple-600 font-bold mt-1">•</span>
                      <span className="text-gray-700">{assumption}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Next Steps
                </h3>
                <ol className="space-y-2">
                  {scope.next_steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="text-purple-600 font-bold min-w-6">
                        {idx + 1}.
                      </span>
                      <span className="text-gray-700">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'phases' && (
            <div className="space-y-4">
              {scope.phases.map((phase, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {phase.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {phase.duration_weeks} weeks
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">
                        Objectives
                      </h4>
                      <ul className="space-y-1">
                        {phase.objectives.map((obj, i) => (
                          <li key={i} className="text-sm text-gray-600 flex gap-2">
                            <span>•</span>
                            <span>{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">
                        Deliverables
                      </h4>
                      <ul className="space-y-1">
                        {phase.deliverables.map((del, i) => (
                          <li key={i} className="text-sm text-gray-600 flex gap-2">
                            <span>•</span>
                            <span>{del}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-semibold text-gray-700 mb-2">
                      Milestones
                    </h4>
                    <ul className="space-y-1">
                      {phase.milestones.map((milestone, i) => (
                        <li key={i} className="text-sm text-gray-600 flex gap-2">
                          <span className="text-purple-600">✓</span>
                          <span>{milestone}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-gray-700 whitespace-pre-line">
                {scope.timeline_breakdown}
              </p>
            </div>
          )}

          {activeTab === 'risks' && (
            <div className="space-y-4">
              {scope.risks.map((risk, idx) => (
                <div
                  key={idx}
                  className={`border-l-4 p-4 rounded ${
                    risk.likelihood === 'high'
                      ? 'border-red-500 bg-red-50'
                      : risk.likelihood === 'medium'
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-green-500 bg-green-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{risk.risk}</h4>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold capitalize ${
                        risk.likelihood === 'high'
                          ? 'bg-red-200 text-red-900'
                          : risk.likelihood === 'medium'
                            ? 'bg-yellow-200 text-yellow-900'
                            : 'bg-green-200 text-green-900'
                      }`}
                    >
                      {risk.likelihood} likelihood
                    </span>
                  </div>
                  <p className="text-gray-700">
                    <strong>Mitigation:</strong> {risk.mitigation}
                  </p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'mockups' && (
            <div className="space-y-6">
              {scope.mockup_descriptions.map((mockup, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {mockup.screen_name}
                  </h3>
                  <p className="text-gray-700 mb-3">{mockup.description}</p>
                  <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <p className="text-sm text-gray-600">
                      <strong>User Flow:</strong> {mockup.user_flow}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feedback & Approval */}
        {!isApproved && (
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">
              Questions or Feedback?
            </h3>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Let us know if you'd like to adjust the scope, timeline, budget, or anything else..."
              className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 resize-none"
            />
            <div className="mt-4 flex gap-4">
              <button
                onClick={handleApprove}
                disabled={isApproving}
                className="flex-1 bg-purple-600 text-white font-semibold py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isApproving ? 'Approving...' : '✓ Approve & Move to Active'}
              </button>
              <button
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-100 transition"
                onClick={openChangesModal}
              >
                Request Changes
              </button>
            </div>
            {error && (
              <p className="mt-3 text-red-600 text-sm">{error}</p>
            )}
          </div>
        )}

        {isApproved && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <p className="text-green-900">
              ✓ <strong>Scope approved!</strong> Your project is now Active and
              building is underway. You will receive weekly updates via email.
            </p>
          </div>
        )}
      </div>

      {/* Request Changes Modal */}
      {isChangesModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="changes-modal-title"
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            {changesSubmitted ? (
              <div className="text-center py-4">
                <p className="text-2xl mb-2">✓</p>
                <p className="text-lg font-semibold text-gray-900 mb-2">
                  Your request has been submitted
                </p>
                <p className="text-gray-600 mb-6">
                  The team will review your feedback and follow up shortly.
                </p>
                <button
                  onClick={closeChangesModal}
                  className="bg-purple-600 text-white font-semibold px-6 py-2 rounded-lg hover:bg-purple-700 transition"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <h2
                  id="changes-modal-title"
                  className="text-lg font-semibold text-gray-900 mb-1"
                >
                  Request Changes
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  Describe what you would like to adjust — scope, timeline, budget, or anything else.
                </p>
                <textarea
                  ref={changeRequestRef}
                  value={changeRequest}
                  onChange={(e) => setChangeRequest(e.target.value)}
                  placeholder="E.g. Can we reduce the timeline to 6 weeks and remove the reporting phase?"
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 resize-none"
                />
                <div className="mt-4 flex gap-3 justify-end">
                  <button
                    onClick={closeChangesModal}
                    disabled={isSubmittingChanges}
                    className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitChanges}
                    disabled={isSubmittingChanges || !changeRequest.trim()}
                    className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingChanges ? 'Submitting…' : 'Submit Request'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
