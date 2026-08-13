import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import { PrismaModule } from './prisma/prisma.module';
import { NhtsaModule } from './nhtsa/nhtsa.module';
import { LoggerModule } from './logger/logger.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: true,
      formatError: (error: any) => {
        const isProdOrTest = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test';
        if (isProdOrTest) {
          const { extensions, ...rest } = error;
          const { exception, stacktrace, ...safeExtensions } = extensions || {};
          return {
            ...rest,
            message: error.message,
            extensions: safeExtensions,
          };
        }
        return error;
      },
    }),
    LoggerModule,
    PrismaModule,
    NhtsaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}