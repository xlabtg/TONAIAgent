/**
 * MPC v2 public API
 */

export { MPCCoordinatorV2, MPCSigner } from './coordinator.js';
export { createSignerFromShare } from './signer.js';
export {
  computeBindingFactor,
  computeAllBindingFactors,
  computeAggregateNonce,
  serialiseCommitmentList,
} from './binding-factor.js';
export type {
  NonceCommitment,
  PartialSignature,
  Round1Message,
  Round2Message,
  SigningSessionDescriptor,
  AggregateSignature,
  ParticipantId,
  MPCProtocolError,
} from './protocol.js';
