import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) email!: string;
  @Column() name!: string;
  @Column({ select: false }) passwordHash!: string;
  @Column({ default: 'user' }) role!: 'user' | 'admin';
  @Column({ default: 0 }) sessionVersion!: number;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date;
}

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() type!: 'domain' | 'phone' | 'bank';
  @Index() @Column() identifier!: string;
  @Column({ default: '' }) bank!: string;
  @Column() description!: string;
  @Column() evidence!: string;
  @Column({ default: '' }) publicSummary!: string;
  @Column({ default: 'pending' }) status!: 'pending' | 'approved' | 'rejected';
  @Column({ default: '' }) reviewReason!: string;
  @Column({ type: 'uuid', nullable: true }) reviewerId!: string | null;
  @Column() userId!: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'userId' }) user!: User;
  @Column({ default: false }) isDemo!: boolean;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date;
}

@Entity('verified_subjects')
@Index(['type', 'identifier', 'bank'], { unique: true })
export class VerifiedSubject {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() type!: 'domain' | 'phone' | 'bank';
  @Column() identifier!: string;
  @Column({ default: '' }) bank!: string;
  @Column() verdict!: 'caution' | 'official';
  @Column() note!: string;
  @Column({ default: false }) isDemo!: boolean;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date;
}

@Entity('rules')
export class Rule {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) code!: string;
  @Column() title!: string;
  @Column('jsonb') keywords!: string[];
  @Column('integer') weight!: number;
  @Column() reason!: string;
  @Column() action!: string;
  @Column({ default: true }) enabled!: boolean;
}

@Entity('histories')
export class History {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() userId!: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'userId' }) user!: User;
  @Column() type!: 'message' | 'url';
  @Column() content!: string;
  @Column('jsonb') result!: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date;
}

export const entities = [User, Report, VerifiedSubject, Rule, History];
