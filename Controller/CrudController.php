<?php

/**
 * Created by JetBrains PhpStorm.
 * User: krun
 * Date: 17.09.13
 * Time: 15:35
 * To change this template use File | Settings | File Templates.
 */

namespace Hexmedia\AdministratorBundle\Controller;

use Doctrine\ORM\EntityManager;
use Hexmedia\AdministratorBundle\Controller\ListTrait;
use Symfony\Component\Form\Exception\OutOfBoundsException;
use Symfony\Component\HttpFoundation\Request;
use FOS\RestBundle\Controller\Annotations as Rest;
use FOS\RestBundle\Controller\FOSRestController as Controller;
use Hexmedia\AdministratorBundle\ControllerInterface\ListController as ListControllerInterface;

abstract class CrudController extends Controller implements ListControllerInterface
{

    use ListTrait;

    /**
     * @var \WhiteOctober\BreadcrumbsBundle\Model\Breadcrumbs
     */
    protected $breadcrumbs;

    /**
     * Index
     *
     * @param int $page
     * @param int $pageSize
     * @param string $sort
     * @param string $sortDirection
     *
     * @Rest\View
     */
    public function indexAction($page = 1)
    {

    }

    /**
     * Lists all entities.
     *
     * @Rest\View("HexmediaAdministratorBundle:Table:content.html.twig")
     */
    public function listAction($page = 1)
    {
        $paginator = $this->get("knp_paginator");

        if ($paginator instanceof \Knp\Component\Pager\Paginator) ;

        $query = $this->getPaginatorQuery();

        $pagination = $paginator->paginate(
            $query,
            $page
        );

        $pagination->setTemplate('KnpPaginatorBundle:Pagination:twitter_bootstrap_v3_pagination.html.twig');

        return array(
            'page' => $page,
            'pagination' => $pagination,
            'route' => $this->getRouteName(),
            'routeParams' => $this->getRouteParams(),
            'template' => $this->getListTemplate()
        );
    }

    /**
     * Creates a new  entity.
     */
    public function createAction(Request $request)
    {
        $this->registerBreadcrubms()->addItem($this->get("translator")->trans("Add"));

        $entity = $this->getNewEntity();
        $form = $this->createCreateForm($entity);
        $form->handleRequest($request);

        if ($form->isValid()) {
            $em = $this->getDoctrine()->getManager();

            try {
                if ($form->get("saveAndPublish")->isClicked()) {
                    $entity->setPublished(1);
                }
            } catch (OutOfBoundsException $e) {

            }

            $em->persist($entity);
            $em->flush();

            $this->get('session')->getFlashBag()->add('notice', $this->getEntityName() . ' has been created!');

            if ($form->get("saveAndExit")->isClicked()) {
                return $this->redirect($this->generateUrl($this->getRouteName(), $this->getRouteParams()));
            } else {
                try {
                    if ($form->get("addNext")->isClicked()) {
                        return $this->redirect($this->generateUrl($this->getRouteName() . "Add", $this->getRouteParams()));
                    }
                } catch (OutOfBoundsException $e) {

                }
                return $this->redirect($this->generateUrl($this->getRouteName() . "Edit", $this->getRouteParams(['id' => $entity->getId()])));
            }
        }

        return [
            'entity' => $entity,
            'form' => $form->createView(),
        ];
    }

    /**
     * Creates a form to create an entity.
     *
     * @param mixed $entity The entity
     *
     * @return \Symfony\Component\Form\Form The form
     */
    protected function createCreateForm($entity)
    {
        $form = $this->createForm(
            $this->getAddFormType(), $entity, [
                'action' => $this->generateUrl($this->getRouteName() . "Add", $this->getRouteParams()),
                'method' => 'POST',
            ]
        );

        return $form;
    }


    /**
     * Displays a form to create a new entity.
     *
     * @Rest\View
     */
    public function addAction()
    {
        $this->registerBreadcrubms()->addItem($this->get("translator")->trans("Add"));

        $entity = $this->getNewEntity();
        $form = $this->createCreateForm($entity);

        return [
            'entity' => $entity,
            'form' => $form->createView(),
        ];
    }

    /**
     * Displays a form to edit an existing entity.
     *
     * @Rest\View
     */
    public function editAction($id)
    {
        $this->registerBreadcrubms()->addItem($this->get("translator")->trans("Edit"));

        $entity = $this->getRepository()->find($id);

        if (!$entity) {
            throw $this->createNotFoundException('Unable to find ' . $this->getEntityName() . '.');
        }

        $editForm = $this->createEditForm($entity);

        return [
            'entity' => $entity,
            'form' => $editForm->createView(),
        ];
    }

    /**
     * Creates a form to edit an entity.
     *
     * @param mixed $entity The entity
     *
     * @return \Symfony\Component\Form\Form The form
     */
    protected function createEditForm($entity)
    {
        $form = $this->createForm(
            $this->getEditFormType(), $entity, [
                'action' => $this->generateUrl($this->getRouteName() . "Edit", $this->getRouteParams(['id' => $entity->getId()])),
                'method' => 'PUT',
            ]
        );

        return $form;
    }

    /**
     * Edits an existing entity.
     *
     * @Rest\View
     */
    public function updateAction(Request $request, $id)
    {
        $this->registerBreadcrubms()->addItem($this->get("translator")->trans("Edit"));

        $entity = $this->getRepository()->find($id);

        if (!$entity) {
            throw $this->createNotFoundException('Unable to find ' . $this->getEntityName() . '.');
        }

        $form = $this->createEditForm($entity);
        $form->handleRequest($request);

        if ($form->isValid()) {
            /**
             * @var $em \Doctrine\ORM\EntityManager
             */
            $em = $this->getDoctrine()->getManager();

            try {
                if ($form->get("saveAndPublish")->isClicked()) {
                    $entity->setPublished(1);
                }
            } catch (OutOfBoundsException $e) {

            }

            if ($em->getUnitOfWork()->isScheduledForUpdate($entity)) {
                $this->get('session')->getFlashBag()->add('notice', $this->getEntityName() . ' has been updated!');
            }

            $em->flush();

            if ($form->get("saveAndExit")->isClicked()) {
                return $this->redirect($this->generateUrl($this->getRouteName(), $this->getRouteParams()));
            } else {
                return $this->redirect($this->generateUrl($this->getRouteName() . 'Edit', $this->getRouteParams(['id' => $id])));
            }
        }

        return [
            'entity' => $entity,
            'form' => $form->createView(),
        ];
    }

    /**
     * Deletes an entity.
     *
     * @Rest\View()
     */
    public function deleteAction(Request $request, $id)
    {
        $entity = $this->getRepository()->find($id);

        if (!$entity) {
            throw $this->createNotFoundException('Unable to find ' . $this->getEntityName() . '.');
        }
        $em = $this->getDoctrine()->getManager();

        $em->remove($entity);

        $em->flush();

        return ['success' => true];
    }

    /**
     * @return \Doctrine\ORM\QueryBuilder
     */
    protected function getPaginatorQuery() {
        return $this->getRepository()->getToPaginator();
    }

    protected function getRouteAdditionalParams()
    {
        return [];
    }

    protected function getRouteParams($params = [])
    {
        return array_merge($params, $this->getRouteAdditionalParams());
    }

    protected abstract function getAddFormType();

    public abstract function getRouteName();

    public abstract function getEntityName();

    protected abstract function getListTemplate();

    /**
     * Registering BreadCrumbs
     *
     * @return \WhiteOctober\BreadcrumbsBundle\Model\Breadcrumbs
     */
    protected abstract function registerBreadcrubms();

    protected abstract function getNewEntity();

    protected abstract function getRepository();

    protected abstract function getEditFormType();
}
