<?php

namespace Hexmedia\AdministratorBundle\Repository\Doctrine;


trait TranslationTrait
{
    public function findByLocaleBy(array $criteria, array $localeCriteria, $locale = 'pl', array $orderBy = null, $limit = null, $offset = null)
    {
        $queryBuilder = $this->createQueryBuilder("obj");

        $queryBuilder->innerJoin($this->getEntityName() . "Translation", "trans", "WITH", "obj.id=trans.translatable");

        $queryBuilder->where("trans.locale = :locale");

        foreach ($criteria as $key => $value) {
            $queryBuilder->andWhere("obj.$key => :$key");
            $queryBuilder->setParameter(":$key", $value);
        }


        foreach ($localeCriteria as $key => $value) {
            $queryBuilder->andWhere("trans.$key => :$key");
            $queryBuilder->setParameter(":$key", $value);
        }

        $queryBuilder->setParameter(":locale", $locale);

        if ($orderBy) {
            $queryBuilder->orderBy($orderBy);
        }

        if ($limit) {
            $queryBuilder->setMaxResults($limit);
        }

        if ($offset) {
            $queryBuilder->setFirstResult($limit);
        }

        return $queryBuilder->getQuery()->getResult();
    }

    public function findOneByLocaleBy(array $criteria, array $localeCriteria, $locale = 'pl')
    {
        $queryBuilder = $this->createQueryBuilder("obj");

        $queryBuilder->innerJoin($this->getEntityName() . "Translation", "trans", "WITH", "obj.id=trans.translatable");

        $queryBuilder->where("trans.locale = :locale");

        foreach ($criteria as $key => $value) {
            $queryBuilder->andWhere("obj.$key = :$key");
            $queryBuilder->setParameter(":$key", $value);
        }


        foreach ($localeCriteria as $key => $value) {
            $queryBuilder->andWhere("trans.$key = :$key");
            $queryBuilder->setParameter(":$key", $value);
        }

        $queryBuilder->setParameter(":locale", $locale);

        $queryBuilder->setMaxResults(1);

        try {
            return $queryBuilder->getQuery()->getSingleResult();
        } catch (NoResultException $e) {
            return null;
        }
    }
} 