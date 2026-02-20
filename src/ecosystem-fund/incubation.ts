/**
 * TONAIAgent - Incubation & Acceleration
 *
 * Mentorship, technical support, co-marketing, and capital access programs.
 */

import {
  IncubationConfig,
  IncubationProgram,
  ProgramStatus,
  IncubationTrack,
  Mentor,
  IncubationApplication,
  IncubationApplicationStatus,
  ApplicationScore,
  IncubationParticipant,
  ParticipantStatus,
  ParticipantMilestone,
  MeetingRecord,
  ProgramEvent,
  ProgramResource,
  ProgramMetrics,
  ApplicantProfile,
  MilestoneStatus,
  ApplyToIncubationRequest,
  AIEvaluationResult,
  EcosystemFundEvent,
  EcosystemFundEventCallback,
} from './types';

// ============================================================================
// Incubation Manager Interface
// ============================================================================

export interface IncubationManager {
  readonly config: IncubationConfig;

  // Program operations
  createProgram(
    program: Omit<IncubationProgram, 'id' | 'participants' | 'metrics' | 'createdAt'>
  ): Promise<IncubationProgram>;
  getProgram(programId: string): Promise<IncubationProgram>;
  getPrograms(filter?: ProgramFilter): Promise<IncubationProgram[]>;
  updateProgramStatus(programId: string, status: ProgramStatus): Promise<IncubationProgram>;

  // Track operations
  addTrack(programId: string, track: Omit<IncubationTrack, 'id'>): Promise<IncubationTrack>;
  getTrack(programId: string, trackId: string): Promise<IncubationTrack>;

  // Mentor operations
  addMentor(programId: string, mentor: Omit<Mentor, 'id'>): Promise<Mentor>;
  getMentors(programId: string): Promise<Mentor[]>;

  // Application operations
  submitApplication(
    request: ApplyToIncubationRequest,
    applicant: ApplicantProfile
  ): Promise<IncubationApplication>;
  getApplication(applicationId: string): Promise<IncubationApplication>;
  getApplications(programId: string, filter?: ApplicationFilter): Promise<IncubationApplication[]>;
  scoreApplication(
    applicationId: string,
    score: Omit<ApplicationScore, 'reviewerId'>,
    reviewerId: string
  ): Promise<IncubationApplication>;
  updateApplicationStatus(
    applicationId: string,
    status: IncubationApplicationStatus
  ): Promise<IncubationApplication>;
  setAIEvaluation(
    applicationId: string,
    evaluation: AIEvaluationResult
  ): Promise<IncubationApplication>;

  // Participant operations
  acceptApplication(applicationId: string): Promise<IncubationParticipant>;
  getParticipant(participantId: string): Promise<IncubationParticipant>;
  getParticipants(programId: string): Promise<IncubationParticipant[]>;
  updateParticipantStatus(
    participantId: string,
    status: ParticipantStatus
  ): Promise<IncubationParticipant>;
  assignMentor(participantId: string, mentorId: string): Promise<IncubationParticipant>;

  // Progress tracking
  recordMeeting(
    participantId: string,
    meeting: Omit<MeetingRecord, 'id'>
  ): Promise<MeetingRecord>;
  updateMilestone(
    participantId: string,
    week: number,
    status: MilestoneStatus,
    feedback?: string
  ): Promise<ParticipantMilestone>;
  graduateParticipant(participantId: string): Promise<IncubationParticipant>;

  // Events and resources
  addEvent(programId: string, event: Omit<ProgramEvent, 'id'>): Promise<ProgramEvent>;
  addResource(programId: string, resource: Omit<ProgramResource, 'id'>): Promise<ProgramResource>;

  // Statistics
  getProgramMetrics(programId: string): Promise<ProgramMetrics>;

  // Events
  onEvent(callback: EcosystemFundEventCallback): void;
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface ProgramFilter {
  status?: ProgramStatus;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface ApplicationFilter {
  trackId?: string;
  status?: IncubationApplicationStatus;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultIncubationManager implements IncubationManager {
  readonly config: IncubationConfig;

  private programs: Map<string, IncubationProgram> = new Map();
  private applications: Map<string, IncubationApplication> = new Map();
  private participants: Map<string, IncubationParticipant> = new Map();
  private readonly eventCallbacks: EcosystemFundEventCallback[] = [];

  constructor(config: Partial<IncubationConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      programDuration: config.programDuration ?? 3,
      cohortSize: config.cohortSize ?? 10,
      applicationPeriod: config.applicationPeriod ?? 30,
      stipend: config.stipend ?? '5000',
      equity: config.equity,
      mentorCount: config.mentorCount ?? 3,
      officeHours: config.officeHours ?? true,
    };
  }

  // ============================================================================
  // Program Operations
  // ============================================================================

  async createProgram(
    program: Omit<IncubationProgram, 'id' | 'participants' | 'metrics' | 'createdAt'>
  ): Promise<IncubationProgram> {
    const newProgram: IncubationProgram = {
      ...program,
      id: this.generateId('program'),
      participants: [],
      metrics: {
        applicationsReceived: 0,
        acceptanceRate: 0,
        participantCount: 0,
        completionRate: 0,
        fundingRaised: '0',
        followOnRate: 0,
        averageGrowth: 0,
        successStories: 0,
      },
      createdAt: new Date(),
    };

    this.programs.set(newProgram.id, newProgram);

    return newProgram;
  }

  async getProgram(programId: string): Promise<IncubationProgram> {
    const program = this.programs.get(programId);
    if (!program) {
      throw new Error(`Program not found: ${programId}`);
    }
    return { ...program };
  }

  async getPrograms(filter?: ProgramFilter): Promise<IncubationProgram[]> {
    let programs = Array.from(this.programs.values());

    if (filter) {
      if (filter.status) {
        programs = programs.filter((p) => p.status === filter.status);
      }
      if (filter.fromDate) {
        programs = programs.filter((p) => p.startDate >= filter.fromDate!);
      }
      if (filter.toDate) {
        programs = programs.filter((p) => p.startDate <= filter.toDate!);
      }
      if (filter.offset) {
        programs = programs.slice(filter.offset);
      }
      if (filter.limit) {
        programs = programs.slice(0, filter.limit);
      }
    }

    return programs;
  }

  async updateProgramStatus(
    programId: string,
    status: ProgramStatus
  ): Promise<IncubationProgram> {
    const program = this.programs.get(programId);
    if (!program) {
      throw new Error(`Program not found: ${programId}`);
    }

    program.status = status;
    this.programs.set(programId, program);

    return program;
  }

  // ============================================================================
  // Track Operations
  // ============================================================================

  async addTrack(
    programId: string,
    track: Omit<IncubationTrack, 'id'>
  ): Promise<IncubationTrack> {
    const program = this.programs.get(programId);
    if (!program) {
      throw new Error(`Program not found: ${programId}`);
    }

    const newTrack: IncubationTrack = {
      ...track,
      id: this.generateId('track'),
    };

    program.tracks.push(newTrack);
    this.programs.set(programId, program);

    return newTrack;
  }

  async getTrack(programId: string, trackId: string): Promise<IncubationTrack> {
    const program = this.programs.get(programId);
    if (!program) {
      throw new Error(`Program not found: ${programId}`);
    }

    const track = program.tracks.find((t) => t.id === trackId);
    if (!track) {
      throw new Error(`Track not found: ${trackId}`);
    }

    return { ...track };
  }

  // ============================================================================
  // Mentor Operations
  // ============================================================================

  async addMentor(programId: string, mentor: Omit<Mentor, 'id'>): Promise<Mentor> {
    const program = this.programs.get(programId);
    if (!program) {
      throw new Error(`Program not found: ${programId}`);
    }

    const newMentor: Mentor = {
      ...mentor,
      id: this.generateId('mentor'),
    };

    program.mentors.push(newMentor);
    this.programs.set(programId, program);

    return newMentor;
  }

  async getMentors(programId: string): Promise<Mentor[]> {
    const program = this.programs.get(programId);
    if (!program) {
      throw new Error(`Program not found: ${programId}`);
    }

    return [...program.mentors];
  }

  // ============================================================================
  // Application Operations
  // ============================================================================

  async submitApplication(
    request: ApplyToIncubationRequest,
    applicant: ApplicantProfile
  ): Promise<IncubationApplication> {
    const program = this.programs.get(request.programId);
    if (!program) {
      throw new Error(`Program not found: ${request.programId}`);
    }

    const track = program.tracks.find((t) => t.id === request.trackId);
    if (!track) {
      throw new Error(`Track not found: ${request.trackId}`);
    }

    if (program.status !== 'applications_open') {
      throw new Error('Applications are not open for this program');
    }

    const application: IncubationApplication = {
      id: this.generateId('inc-application'),
      programId: request.programId,
      trackId: request.trackId,
      applicant,
      team: request.team,
      project: request.project,
      vision: request.vision,
      traction: request.traction,
      askFromProgram: request.askFromProgram,
      coachability: request.coachability,
      status: 'submitted',
      scores: [],
      submittedAt: new Date(),
    };

    this.applications.set(application.id, application);

    // Update program metrics
    program.metrics.applicationsReceived++;
    this.programs.set(request.programId, program);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'incubation_application',
      category: 'incubation',
      data: {
        applicationId: application.id,
        programId: request.programId,
        trackId: request.trackId,
      },
      actorId: applicant.id,
      relatedId: application.id,
    });

    return application;
  }

  async getApplication(applicationId: string): Promise<IncubationApplication> {
    const application = this.applications.get(applicationId);
    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }
    return { ...application };
  }

  async getApplications(
    programId: string,
    filter?: ApplicationFilter
  ): Promise<IncubationApplication[]> {
    let applications = Array.from(this.applications.values()).filter(
      (a) => a.programId === programId
    );

    if (filter) {
      if (filter.trackId) {
        applications = applications.filter((a) => a.trackId === filter.trackId);
      }
      if (filter.status) {
        applications = applications.filter((a) => a.status === filter.status);
      }
      if (filter.offset) {
        applications = applications.slice(filter.offset);
      }
      if (filter.limit) {
        applications = applications.slice(0, filter.limit);
      }
    }

    return applications;
  }

  async scoreApplication(
    applicationId: string,
    score: Omit<ApplicationScore, 'reviewerId'>,
    reviewerId: string
  ): Promise<IncubationApplication> {
    const application = this.applications.get(applicationId);
    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    const fullScore: ApplicationScore = {
      ...score,
      reviewerId,
    };

    application.scores.push(fullScore);

    if (application.status === 'submitted') {
      application.status = 'screening';
    }

    this.applications.set(applicationId, application);

    return application;
  }

  async updateApplicationStatus(
    applicationId: string,
    status: IncubationApplicationStatus
  ): Promise<IncubationApplication> {
    const application = this.applications.get(applicationId);
    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    application.status = status;
    if (status === 'accepted' || status === 'rejected' || status === 'waitlisted') {
      application.decidedAt = new Date();
    }

    this.applications.set(applicationId, application);

    return application;
  }

  async setAIEvaluation(
    applicationId: string,
    evaluation: AIEvaluationResult
  ): Promise<IncubationApplication> {
    const application = this.applications.get(applicationId);
    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    application.aiEvaluation = evaluation;
    this.applications.set(applicationId, application);

    return application;
  }

  // ============================================================================
  // Participant Operations
  // ============================================================================

  async acceptApplication(applicationId: string): Promise<IncubationParticipant> {
    const application = this.applications.get(applicationId);
    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    const program = this.programs.get(application.programId);
    if (!program) {
      throw new Error(`Program not found: ${application.programId}`);
    }

    const track = program.tracks.find((t) => t.id === application.trackId);
    if (!track) {
      throw new Error(`Track not found: ${application.trackId}`);
    }

    // Create milestones from curriculum
    const milestones: ParticipantMilestone[] = track.curriculum.map((module) => ({
      week: module.week,
      title: module.title,
      description: module.description,
      status: 'pending' as MilestoneStatus,
    }));

    const participant: IncubationParticipant = {
      id: this.generateId('participant'),
      programId: application.programId,
      trackId: application.trackId,
      applicationId,
      project: application.project,
      team: application.team,
      progress: {
        weeklyCheckIns: 0,
        mentorMeetings: 0,
        workshopsAttended: 0,
        milestonesCompleted: 0,
        overallProgress: 0,
      },
      milestones,
      meetings: [],
      status: 'onboarding',
      joinedAt: new Date(),
    };

    // Update application status
    application.status = 'accepted';
    application.decidedAt = new Date();
    this.applications.set(applicationId, application);

    // Add to program
    program.participants.push(participant);
    program.metrics.participantCount++;
    program.metrics.acceptanceRate =
      program.metrics.participantCount / program.metrics.applicationsReceived;
    this.programs.set(application.programId, program);

    this.participants.set(participant.id, participant);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'incubation_accepted',
      category: 'incubation',
      data: {
        participantId: participant.id,
        programId: application.programId,
        projectName: application.project.name,
      },
      actorId: application.applicant.id,
      relatedId: participant.id,
    });

    return participant;
  }

  async getParticipant(participantId: string): Promise<IncubationParticipant> {
    const participant = this.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant not found: ${participantId}`);
    }
    return { ...participant };
  }

  async getParticipants(programId: string): Promise<IncubationParticipant[]> {
    return Array.from(this.participants.values()).filter(
      (p) => p.programId === programId
    );
  }

  async updateParticipantStatus(
    participantId: string,
    status: ParticipantStatus
  ): Promise<IncubationParticipant> {
    const participant = this.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant not found: ${participantId}`);
    }

    participant.status = status;
    this.participants.set(participantId, participant);

    return participant;
  }

  async assignMentor(
    participantId: string,
    mentorId: string
  ): Promise<IncubationParticipant> {
    const participant = this.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant not found: ${participantId}`);
    }

    participant.mentor = mentorId;
    this.participants.set(participantId, participant);

    return participant;
  }

  // ============================================================================
  // Progress Tracking
  // ============================================================================

  async recordMeeting(
    participantId: string,
    meeting: Omit<MeetingRecord, 'id'>
  ): Promise<MeetingRecord> {
    const participant = this.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant not found: ${participantId}`);
    }

    const fullMeeting: MeetingRecord = {
      ...meeting,
      id: this.generateId('meeting'),
    };

    participant.meetings.push(fullMeeting);

    // Update progress
    if (meeting.type === 'mentor') {
      participant.progress.mentorMeetings++;
    } else if (meeting.type === 'check_in') {
      participant.progress.weeklyCheckIns++;
    } else if (meeting.type === 'workshop') {
      participant.progress.workshopsAttended++;
    }

    this.participants.set(participantId, participant);

    return fullMeeting;
  }

  async updateMilestone(
    participantId: string,
    week: number,
    status: MilestoneStatus,
    feedback?: string
  ): Promise<ParticipantMilestone> {
    const participant = this.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant not found: ${participantId}`);
    }

    const milestone = participant.milestones.find((m) => m.week === week);
    if (!milestone) {
      throw new Error(`Milestone not found for week: ${week}`);
    }

    milestone.status = status;
    milestone.feedback = feedback;
    if (status === 'completed') {
      milestone.completedAt = new Date();
      participant.progress.milestonesCompleted++;
    }

    // Update overall progress
    participant.progress.overallProgress =
      (participant.progress.milestonesCompleted / participant.milestones.length) * 100;

    this.participants.set(participantId, participant);

    return milestone;
  }

  async graduateParticipant(participantId: string): Promise<IncubationParticipant> {
    const participant = this.participants.get(participantId);
    if (!participant) {
      throw new Error(`Participant not found: ${participantId}`);
    }

    participant.status = 'graduated';
    participant.graduatedAt = new Date();
    this.participants.set(participantId, participant);

    // Update program metrics
    const program = this.programs.get(participant.programId);
    if (program) {
      const graduated = program.participants.filter((p) => p.status === 'graduated').length;
      program.metrics.completionRate = graduated / program.metrics.participantCount;
      program.metrics.successStories++;
      this.programs.set(participant.programId, program);
    }

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'incubation_graduated',
      category: 'incubation',
      data: {
        participantId,
        programId: participant.programId,
        projectName: participant.project.name,
      },
      relatedId: participantId,
    });

    return participant;
  }

  // ============================================================================
  // Events and Resources
  // ============================================================================

  async addEvent(
    programId: string,
    event: Omit<ProgramEvent, 'id'>
  ): Promise<ProgramEvent> {
    const program = this.programs.get(programId);
    if (!program) {
      throw new Error(`Program not found: ${programId}`);
    }

    const fullEvent: ProgramEvent = {
      ...event,
      id: this.generateId('event'),
    };

    program.events.push(fullEvent);
    this.programs.set(programId, program);

    return fullEvent;
  }

  async addResource(
    programId: string,
    resource: Omit<ProgramResource, 'id'>
  ): Promise<ProgramResource> {
    const program = this.programs.get(programId);
    if (!program) {
      throw new Error(`Program not found: ${programId}`);
    }

    const fullResource: ProgramResource = {
      ...resource,
      id: this.generateId('resource'),
    };

    program.resources.push(fullResource);
    this.programs.set(programId, program);

    return fullResource;
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  async getProgramMetrics(programId: string): Promise<ProgramMetrics> {
    const program = this.programs.get(programId);
    if (!program) {
      throw new Error(`Program not found: ${programId}`);
    }

    return { ...program.metrics };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: EcosystemFundEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: EcosystemFundEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createIncubationManager(
  config?: Partial<IncubationConfig>
): DefaultIncubationManager {
  return new DefaultIncubationManager(config);
}
